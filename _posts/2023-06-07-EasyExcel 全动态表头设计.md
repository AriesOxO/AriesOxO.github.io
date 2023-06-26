---
author: meow
comments: true
title: 全动态表头设计
wordpress_id: 260
categories:
- 后端
tags:
- java
- easyexcel
- excel
---
## 设计思路
- 使用对象控制导出，在需要导出的属性增加@ExcelProperty.class注解
- 在导出之前使用工具类根据配置动态修改表头和排除不需要导出的字段下标set
- 使用excludeColumnIndexes方法进行排除（注意升级到最新版本）

1. 增加导出配置控制类

```java
@Data
public class ExportConfig {
    /**
     * 对应表头导出的字段名称，eg：pi,pv
     */
    String tableHeaderItem;
    /**
     * 是否开启导出.1:开启 0:关闭
     */
    Integer enable ;
    /**
     * 自定义显示文案
     */
    String displayText;
}
```

## 数据库变更

1. 新增配置项

```sql
#新增导出配置
INSERT INTO config (`KEY`, VALUE, COMMENT)
VALUES
('exportConfig',
 '[{"tableHeaderItem": "pi","enable": 1,"displayText":"签字时间"},
  {"tableHeaderItem": "pv","enable": 1,"displayText":"住院号"}]',
 '通用数据导出配置');

 select * from config where `key` ='exportConfig' ORDER BY create_time limit 1
#获取配置时，根据实际进行获取。

 #更新导出配置
UPDATE config
SET VALUE= '[{"tableHeaderItem": "pi","enable": 1,"displayText":"病案号"},
  {"tableHeaderItem": "pv","enable": 1,"displayText":"住院号"}]'
WHERE `KEY`= 'exportConfig';
```

1. 可配置逻辑具体流程

## @ExcelProperty 控制导出

- 获取最新配置
- JSONArray._parseArray_(value)反序列化为 List<ExportConfig>
- 遍历 List 数据内容进行配置处理。

  - 控制字段是否需要显示：使用 excludeColumnIndexes 方法
  - 更新字段文案 ：新增根据注解类字段获取 ExcelProperty 注解中的 index 值,根据 displayText 和 index 修改字段显示文案


```java
Integer getIndexByValue(Class<?> clazz, String value) {
// 获取所有声明的字段
Field[] fields = getAllFields(clazz);
// 遍历所有字段
for (Field field : fields) {
// 获取字段上的 ExcelProperty 注解
ExcelProperty excelProperty = field.getAnnotation(ExcelProperty.class);
// 如果注解不为空且字段值等于要查找的值
if (excelProperty != null && value.equals(field.getName())) {
// 返回 index 值
return excelProperty.index();
}
}
// 如果没有找到，返回 -1
return -1;
}
```

```java
/**

* 用于获取所有字段,包含父类
  */
  public static Field[] getAllFields(Class<?> clazz) {
  List<Field> fieldList = new ArrayList<>();
  while (clazz != null) {
  // 当父类为 null 的时候说明到达了最上层的父类 (Object 类)
  fieldList.addAll(Arrays.asList(clazz.getDeclaredFields()));
  // 得到父类,然后赋给自己
  clazz = clazz.getSuperclass();
  }
  Field[] fields = new Field[fieldList.size()];
  return fieldList.toArray(fields);
  }
```
## 完整工具类代码
```java
import com.alibaba.druid.util.lang.Consumer;
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONException;
import com.biz.bo.ExportConfigBo;
import com.dal.entity.vte.config;
import com.dal.mapper.configExtMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import javax.annotation.Resource;
import java.lang.annotation.Annotation;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.*;
import java.util.stream.Collectors;
/**
 * @Author: meowQAQ
 * @Date: 2023/5/29 15:17
 * @Description:
 */
@Component
public class ExcelExportConfigUtil {
    private static final Logger log = LoggerFactory.getLogger(ExcelExportConfigUtil.class);
    @Resource
    private configExtMapper configExtMapper;
    private static final String exportConfigKey = "exportConfig ";

    /**
     * 根据对象字段获取@ExcelProperty相关属性
     *
     * @param clazz
     * @param value
     * @return
     */
    public Integer getIndexByValue(Class<?> clazz, String value) {
        // 获取所有声明的字段
        Field[] fields = getAllFields(clazz);
        // 遍历所有字段
        for (Field field : fields) {
            // 获取字段上的 ExcelProperty 注解
            ExcelProperty excelProperty = field.getAnnotation(ExcelProperty.class);
            // 如果注解不为空且字段值等于要查找的值
            if (excelProperty != null && value.equals(field.getName())) {
                // 返回 index 值
                return excelProperty.index();
            }
        }
        // 如果没有找到，返回 -1
        return -1;
    }

    /**
     * 根据配置控制字段显示
     *
     * @param headers
     */

    public void modifyExportHeader(List<ExcelTableHeader> headers) {
        Iterator<ExcelTableHeader> iterator = headers.iterator();
        Config config = configExtMapper.getConfigByKey(exportConfigKey);
        if (null != config && !config.getValue().isEmpty()) {
            try {
                List<ExportConfigBo> exportConfigBoList = JSONArray.parseArray(config.getValue(), ExportConfigBo.class);
                if (!exportConfigBoList.isEmpty()) {
                    Map<String, ExportConfigBo> map = exportConfigBoList.stream().collect(Collectors.toMap(ExportConfigBo::getTableHeaderItem, d -> d));
                    while (iterator.hasNext()) {
                        ExcelTableHeader item = iterator.next();
                        ExportConfigBo configDto = map.get(item.getField());
                        if (null != configDto) {
                            //关闭字段显示
                            if (0 == configDto.getEnable()) {
                                iterator.remove();
                            } else {
                                //更新显示文案
                                item.setTitle(configDto.getDisplayText());
                            }
                        }
                    }
                }

            } catch (JSONException exception) {
                log.debug("[ExcelUtil][modifyExportHeader]数据库Value字段不合法,转换识别，key={},case={},info={}", exportConfigKey, exception.getCause().getMessage());
            }

        }

    }


    /**
     * 根据配置返回需求排除的字段，如果有的情况下，并且更新字段值为数据库配置的表头
     *
     * @param templateClazz
     * @param annotationClazz
     * @return
     */
    public List<Integer> modifyFieldsbyConfig(Class templateClazz, Class annotationClazz) {
        List<Integer> excludeIndex = new ArrayList<>();
        VteHospitalConfig config = vteHospitalConfigExtMapper.getConfigByKey(exportConfigKey);
        if (null != config) {
            try {
                List<ExportConfigBo> exportConfigBoList = JSONArray.parseArray(config.getValue(), ExportConfigBo.class);
                if (!exportConfigBoList.isEmpty()) {
                    for (ExportConfigBo T : exportConfigBoList) {
                        Integer index = getIndexByValue(templateClazz, T.getTableHeaderItem());
                        //对象类没有目标字段
                        if (-1 == index) {
                            log.debug("[modifyFieldsbyConfig]class={}缺失适配字段{}", templateClazz.getName(), T.getTableHeaderItem());
                            continue;
                        }
                        //不显示字段
                        if (0 == T.getEnable()) {
                            excludeIndex.add(index);
                        } else {
                            //更新表头字段展示文案
                            modifyFileds(templateClazz, annotationClazz, map -> {
                                map.put("value", new String[]{T.getDisplayText()});
                                map.put("index", index);
                            }, T.getTableHeaderItem());
                        }
                    }

                }

            } catch (JSONException exception) {
                log.debug("[modifyFieldsbyConfig]数据库Value字段不合法,转换识别，key={},case={},info={}", exportConfigKey, exception.getCause().getMessage());
            }
        }
        return excludeIndex;
    }


    /**
     * @param templateClazz   需要修改的类
     * @param annotationClazz 需要修改的注解
     * @param consumer        新的索引和注解值
     * @param classFieldName  修改类字段名称
     */
    public void modifyFileds(Class templateClazz, Class annotationClazz, Consumer<Map> consumer, String classFieldName) {
        try {
            // 获取实体类字段
            Field[] fields = getAllFields(templateClazz);
            Field field = null;
            for (Field T : fields) {
                if (classFieldName.equals(T.getName())) {
                    field = T;
                    break;
                }
            }
            // 获取实体类字段的注解类
            Annotation annotation = field.getAnnotation(annotationClazz);
            // 将注解类生成一个代理对象
            InvocationHandler invocationHandler = Proxy.getInvocationHandler(annotation);
            Field annotationValues = invocationHandler.getClass().getDeclaredField("memberValues");
            annotationValues.setAccessible(true);
            Map map = (Map) annotationValues.get(invocationHandler);
            consumer.accept(map);
        } catch (Exception e) {
            log.debug("{},{}", e.getCause(), e.getMessage());
        }
    }

    /**
     * 用于获取所有字段,包含父类
     */
    public static Field[] getAllFields(Class<?> clazz) {
        List<Field> fieldList = new ArrayList<>();
        while (clazz != null) {
            // 当父类为null的时候说明到达了最上层的父类 (Object类)
            fieldList.addAll(Arrays.asList(clazz.getDeclaredFields()));
            // 得到父类,然后赋给自己
            clazz = clazz.getSuperclass();
        }
        Field[] fields = new Field[fieldList.size()];
        return fieldList.toArray(fields);
    }

}

```
## 抽象导出方法
``` java
  public void exportExcel(HttpServletResponse response, String sheetName, Query query) throws IOException {
        //单位秒
        long start = System.currentTimeMillis() / 1000;
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd-HH-mm-ss");
        String nowTime = format.format(new Date());
        StringBuffer bf = new StringBuffer();
        String fileName = bf.append(sheetName)
                .append(nowTime)
                .append(".xlsx")
                .toString();
        OutputStream out = getOutputStream(response, fileName, ExcelTypeEnum.XLSX);
        ExcelWriter excelWriter = EasyExcelFactory.write(out)
                .build();
        //创建sheet
        WriteSheet writeSheet = EasyExcelFactory.writerSheet()
                .build();
        //排查指定列不显示
        Set<Integer> excludeColumnIndexesList = new HashSet<>();
        //根据配置动态调整表头（删改）
        excludeColumnIndexesList.addAll(excelExportConfigUtil.modifyFieldsbyConfig(getDataClass(), ExcelProperty.class));
        // 这里 需要指定写用哪个class去写
        WriteTable writeTable = EasyExcelFactory.writerTable(0)
                .head(getDataClass()).excludeColumnIndexes(excludeColumnIndexesList)
                .build();
        // 查询总数
        Integer number = selectCount(query);
        // 总分页数量
        int pageNumber = (int) Math.ceil((double) number / (double) ExportExcelUtil.PAGE_SIZE);
        if (pageNumber == 0) {
            excelWriter.write(new ArrayList<>(), writeSheet, writeTable);
        }
        // 去调用写入,根据数据库分页的总的页数来
        for (int i = 1; i <= pageNumber; i++) {
            // 分页查询数据
            query.setOffset(ExportExcelUtil.getOffset(i, ExportExcelUtil.PAGE_SIZE));
            query.setLimit(ExportExcelUtil.PAGE_SIZE);
            //抽象的数据源
            List<?> list = new ArrayList<>();
            excelWriter.write(list, writeSheet, writeTable);
            dataList.clear();
        }
        // 千万别忘记finish 会帮忙关闭流
        excelWriter.finish();
        long end = System.currentTimeMillis() / 1000;
        log.info("导出耗时：" + (end - start) + " 秒");
        out.flush();
    }
```
---
