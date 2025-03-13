---
author: meow
comments: true
title: 使用MyBatis拦截器捕获和拼接完整SQL的实现过程
categories:
  - 后端
tags:
  - Java
  - MyBatis
  - SQL
  - SpringBoot
---

## 使用MyBatis拦截器捕获和拼接完整SQL的实现过程
 最近要实现一个安全审计功能,需要记录用户操作系统过程中下载数据的所有行为，具体到实际执行的sql,核心需要获取到接口执行过程中所有的sql语句。

### 拦截器实现以及解释

```java

import org.apache.ibatis.executor.statement.StatementHandler;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.ParameterMapping;
import org.apache.ibatis.plugin.*;
import org.apache.ibatis.session.ResultHandler;
import org.apache.commons.beanutils.PropertyUtils;

import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SQL 捕获拦截器，用于拦截 MyBatis 执行的 SQL 并拼接参数生成完整语句
 */
@Intercepts({
    // 定义拦截点：拦截 StatementHandler 的 query 方法
    // StatementHandler 是 MyBatis 执行 SQL 的底层接口，query 方法负责实际查询
    // args 指定方法参数类型：Statement 和 ResultHandler
    @Signature(type = StatementHandler.class, method = "query",
               args = {Statement.class, ResultHandler.class})
})
@Component // 声明为 Spring Bean，确保通过依赖注入使用
public class SqlCaptureInterceptor implements Interceptor {

    // 使用 ThreadLocal 存储当前线程捕获的 SQL，ConcurrentLinkedQueue 保证线程安全
    // 每个线程独立维护自己的 SQL 列表，避免多线程干扰
    private static final ThreadLocal<ConcurrentLinkedQueue<String>> SQL_HOLDER =
        ThreadLocal.withInitial(ConcurrentLinkedQueue::new);

    /**
     * 拦截方法，在 MyBatis 执行 SQL 时触发
     * @param invocation 包含被拦截的目标对象、方法和参数
     * @return 执行结果，原样返回以不干扰正常流程
     * @throws Throwable 如果处理过程中出错
     */
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        System.out.println("Intercepting statement query..."); // 调试日志，确认拦截触发
        // 获取目标对象：StatementHandler
        StatementHandler handler = (StatementHandler) invocation.getTarget();
        // 从 StatementHandler 中获取 BoundSql，包含 SQL 和参数信息
        BoundSql boundSql = handler.getBoundSql();
        System.out.println("Parameter: " + boundSql.getParameterObject()); // 输出参数对象
        // 捕获并处理 SQL
        captureSql(boundSql);
        // 继续执行原方法，不干扰 MyBatis 正常查询
        return invocation.proceed();
    }

    /**
     * 捕获 SQL 并处理参数拼接
     * @param boundSql 包含 SQL 语句和参数映射的对象
     */
    private void captureSql(BoundSql boundSql) {
        // 获取原始 SQL 并格式化，去除多余空格
        String sql = boundSql.getSql().replaceAll("\\s+", " ").trim();
        System.out.println("Original SQL: " + sql); // 输出原始 SQL，便于调试

        // 获取参数映射列表，描述每个 ? 对应的参数名
        List<ParameterMapping> parameterMappings = boundSql.getParameterMappings();
        // 获取参数对象，可能是简单类型、对象或 List
        Object parameterObject = boundSql.getParameterObject();

        // 如果没有参数映射或参数对象，直接存储原始 SQL
        if (parameterMappings == null || parameterMappings.isEmpty() || parameterObject == null) {
            System.out.println("Captured SQL (no parameters): " + sql);
            SQL_HOLDER.get().add(sql);
            return;
        }

        // 拼接参数后的完整 SQL
        String completedSql = replaceParameters(sql, parameterMappings, boundSql);
        System.out.println("Captured SQL (with parameters): " + completedSql);
        SQL_HOLDER.get().add(completedSql);
    }

    /**
     * 将参数值替换到 SQL 中的 ? 占位符
     * @param sql 原始 SQL 语句
     * @param parameterMappings 参数映射列表
     * @param boundSql BoundSql 对象，包含参数值
     * @return 拼接参数后的完整 SQL
     */
    private String replaceParameters(String sql, List<ParameterMapping> parameterMappings, BoundSql boundSql) {
        String resultSql = sql;
        // 使用正则表达式匹配所有 ? 占位符
        Pattern pattern = Pattern.compile("\\?");
        Matcher matcher = pattern.matcher(resultSql);
        StringBuffer sb = new StringBuffer();
        int index = 0; // 参数索引

        // 遍历所有 ?，按顺序替换参数值
        while (matcher.find()) {
            if (index < parameterMappings.size()) {
                ParameterMapping mapping = parameterMappings.get(index);
                Object value = getParameterValue(boundSql, mapping);
                String replacement = formatValue(value);
                matcher.appendReplacement(sb, replacement);
                index++;
            }
        }
        matcher.appendTail(sb); // 添加剩余部分
        return sb.toString();
    }

    /**
     * 从 BoundSql 中提取参数值
     * @param boundSql BoundSql 对象
     * @param mapping 参数映射，包含参数名
     * @return 参数值，可能为简单类型、List 或对象属性
     */
    private Object getParameterValue(BoundSql boundSql, ParameterMapping mapping) {
        String propertyName = mapping.getProperty(); // 参数名，例如 "key" 或 "list[0]"

        // 检查是否有额外的动态参数（MyBatis 动态 SQL 生成的临时参数）
        if (boundSql.hasAdditionalParameter(propertyName)) {
            return boundSql.getAdditionalParameter(propertyName);
        }

        Object parameterObject = boundSql.getParameterObject();
        if (parameterObject == null) {
            return null; // 无参数值，返回 null
        }

        // 处理简单类型（String、Number 等）
        if (parameterObject instanceof String || parameterObject instanceof Number || parameterObject instanceof Boolean) {
            return parameterObject;
        }

        // 处理 List 类型参数（常见于 <foreach>）
        if (parameterObject instanceof List) {
            List<?> paramList = (List<?>) parameterObject;
            // 如果参数名是 list[0]、list[1] 等形式，提取对应索引的值
            if (propertyName.startsWith("list[")) {
                int listIndex = Integer.parseInt(propertyName.replaceAll("[^0-9]", ""));
                return listIndex < paramList.size() ? paramList.get(listIndex) : null;
            }
            // 如果直接传入整个 List（较少见），返回完整列表
            return paramList;
        }

        // 处理对象类型（如 POJO），通过反射获取属性值
        try {
            return PropertyUtils.getProperty(parameterObject, propertyName);
        } catch (Exception e) {
            System.out.println("Failed to get parameter value for " + propertyName + ": " + e.getMessage());
            return "unknown"; // 获取失败时返回占位符，避免中断
        }
    }

    /**
     * 格式化参数值为 SQL 可用的字符串
     * @param value 参数值
     * @return 格式化后的字符串
     */
    private String formatValue(Object value) {
        if (value == null) {
            return "NULL"; // 空值转为 SQL 的 NULL
        }
        if (value instanceof String) {
            // 字符串加单引号，并处理内部单引号转义
            return "'" + value.toString().replace("'", "''") + "'";
        }
        if (value instanceof List) {
            // 处理 List 类型，将每个元素格式化后用逗号分隔
            List<?> list = (List<?>) value;
            List<String> formattedValues = new ArrayList<>();
            for (Object item : list) {
                formattedValues.add(formatValue(item)); // 递归格式化每个元素
            }
            return String.join(", ", formattedValues);
        }
        // 其他类型（如数字）直接转为字符串
        return value.toString();
    }

    /**
     * 获取当前线程捕获的 SQL
     * @return 拼接后的 SQL 列表，用分号分隔
     */
    public static String getCapturedSql() {
        ConcurrentLinkedQueue<String> sqls = SQL_HOLDER.get();
        String result = sqls == null || sqls.isEmpty() ? "" : String.join(";\n", sqls);
        System.out.println("Returning SQLs: " + result); // 输出最终结果，便于调试
        return result;
    }

    /**
     * 清理当前线程的 SQL 存储
     */
    public static void clearSql() {
        System.out.println("Clearing SQL holder...");
        SQL_HOLDER.remove(); // 移除 ThreadLocal 数据，避免内存泄漏
    }

    /**
     * 包装目标对象，决定是否应用拦截器
     * @param target 被拦截的目标对象
     * @return 包装后的对象或原始对象
     */
    @Override
    public Object plugin(Object target) {
        System.out.println("Wrapping target: " + target.getClass().getName()); // 确认包装目标
        return Plugin.wrap(target, this); // 使用 MyBatis 的 Plugin 工具包装
    }

    /**
     * 设置拦截器属性（可选）
     * @param properties 配置属性
     */
    @Override
    public void setProperties(Properties properties) {
        System.out.println("Setting properties: " + properties); // 输出配置，便于调试
    }
}
```

### 详细解释
-  MyBatis 拦截器设计文档
1. 拦截点选择
- **`@Intercepts` 使用 `StatementHandler.query`**
  - 原因：它是 MyBatis 执行 SQL 的底层入口，能捕获所有查询，包括动态 SQL。
  - 优势：相比 `Executor.query`，`StatementHandler` 更稳定，不受 MyBatis-Plus 等框架的重写影响。

2. SQL 捕获与存储
- **`SQL_HOLDER` 使用 `ThreadLocal` 和 `ConcurrentLinkedQueue`**
  - 目的：确保线程隔离和并发安全。
  - 实现：每个线程独立维护自己的 SQL 列表，避免多线程干扰。
- **`captureSql`**
  - 功能：处理原始 SQL 的格式化（如去除多余空格），并调用参数替换逻辑。
  - 目标：确保捕获的 SQL 可读性好。

3. 参数替换
- **`replaceParameters`**
  - 方法：使用正则表达式匹配 SQL 中的 `?` 占位符，按顺序替换为参数值。
  - 优化：借助 `StringBuffer` 高效拼接，避免字符串不可变带来的性能问题。
  - 细节：通过 `Matcher` 遍历所有 `?`，确保替换准确无遗漏。

4. 参数值提取
- **`getParameterValue`**
  - 支持多种类型参数的提取：
    - **简单类型**
      如 `String`、`Integer`，直接返回原始值。
    - **List 类型**
      处理 `<foreach>` 生成的 `list[0]`、`list[1]` 等参数名，提取对应索引的值。
    - **对象类型**
      通过 `PropertyUtils` 反射获取属性值（需引入 `commons-beanutils`）。
  - **异常处理**
    获取失败时返回 `"unknown"`，避免中断执行，确保拦截器健壮性。

5. 值格式化
- **`formatValue`**
  - 目标：确保参数值符合 SQL 语法。
  - 规则：
    - **字符串**
      加单引号并转义内部单引号（如 `'value'`）。
    - **List**
      展开为逗号分隔的字符串（如 `'key1', 'key2'`）。
    - **其他类型**
      如数字，直接转为字符串（如 `123`）。
    - **空值**
      返回 `NULL`，符合 SQL 标准。

6. 清理与获取
- **`clearSql`**
  - 功能：清理线程数据，移除 `ThreadLocal` 中的内容。
  - 重要性：防止内存泄漏，尤其在长生命周期线程中。
- **`getCapturedSql`**
  - 功能：返回拼接后的 SQL 列表，用分号分隔。
  - 用途：便于业务层获取并记录日志。

7. 插件机制
- **`plugin`**
  - 作用：决定拦截器是否生效，通过 `Plugin.wrap` 包装目标对象（`StatementHandler`）。
  - 调试：日志输出确认包装目标，便于排查问题。
- **`setProperties`**
  - 功能：提供扩展性，可通过配置文件设置拦截器属性。
  - 现状：当前未使用，但保留了接口。

### 使用示例
1. 配置到数据源
```java
@Bean
public SqlSessionFactory sqlSessionFactoryBean(DataSource dataSource) throws Exception {
    SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
    factory.setDataSource(dataSource);
    factory.setPlugins(new Interceptor[]{new SqlCaptureInterceptor()});
    return factory.getObject();
}
```
2. 业务层调用\

```java

@Service
public class BusinessService {
    @Autowired
    private SomeMapper mapper;

    public void doBusiness() {
        List<String> keys = Arrays.asList("key1", "key2");
        mapper.countByKeys(keys);
        String sql = SqlCaptureInterceptor.getCapturedSql();
        System.out.println("Captured SQL: " + sql);
    }
}

```
3. Mapper

```xml
<select id="countByKeys" resultType="integer">
    SELECT count(*) FROM table WHERE key IN
    <foreach collection="keys" item="key" open="(" separator="," close=")">
        #{key}
    </foreach>
</select>
```
4. 输出
```text
Captured SQL: SELECT count(*) FROM table WHERE key IN ('key1', 'key2')
```

