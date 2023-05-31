---
author: meow
comments: true
date: 2022-12-07 09:15:10+00:00
layout: post
link: http://121.40.199.110/index.php/2022/12/07/mybatis%e6%8f%92%e4%bb%b6%e6%9c%ba%e5%88%b6%e8%af%a6%e8%a7%a3/
slug: mybatis%e6%8f%92%e4%bb%b6%e6%9c%ba%e5%88%b6%e8%af%a6%e8%a7%a3
title: Mybatis插件机制详解
wordpress_id: 117
categories:
- 编程
tags:
- JAVA
- MyBatis
- 转载
---




**简介：** Mybatis采用责任链模式，通过动态代理组织多个插件（拦截器），通过这些插件可以改变Mybatis的默认行为（诸如SQL重写之类的），由于插件会深入到Mybatis的核心，因此在编写自己的插件前最好了解下它的原理，以便写出安全高效的插件。







Mybatis插件又称拦截器，本篇文章中出现的拦截器都表示插件。







MyBatis 允许你在已映射语句执行过程中的某一点进行拦截调用。默认情况下，MyBatis 允许使用插件来拦截的方法调用包括：






    
    <code>Executor (update, query, flushStatements, commit, rollback, getTransaction, close, isClosed)
    
    ParameterHandler (getParameterObject, setParameters)
    
    ResultSetHandler (handleResultSets, handleOutputParameters)
    
    StatementHandler (prepare, parameterize, batch, update, query)
    </code>







总体概括为：







拦截执行器的方法







拦截参数的处理







拦截结果集的处理







拦截Sql语法构建的处理







Mybatis是通过动态代理的方式实现拦截的，阅读此篇文章需要先对Java的动态代理机制有所了解。







Mybatis四大接口







既然Mybatis是对四大接口进行拦截的，那我们先要知道Mybatis的四大接口是哪些： Executor, StatementHandler, ResultSetHandler, ParameterHandler。





![image](https://yqfile.alicdn.com/964b2641411e8bcbe369571831899ed51490b900.png)





上图Mybatis框架的整个执行过程。Mybatis插件能够对这四大对象进行拦截，可以说包含到了Mybatis一次SQL执行的所有操作。可见Mybatis的的插件很强大。







Executor是 Mybatis的内部执行器，它负责调用StatementHandler操作数据库，并把结果集通过 ResultSetHandler进行自动映射，另外，他还处理了二级缓存的操作。从这里可以看出，我们也是可以通过插件来实现自定义的二级缓存的。







StatementHandler是Mybatis直接和数据库执行sql脚本的对象。另外它也实现了Mybatis的一级缓存。这里，我们可以使用插件来实现对一级缓存的操作(禁用等等)。







ParameterHandler是Mybatis实现Sql入参设置的对象。插件可以改变我们Sql的参数默认设置。







ResultSetHandler是Mybatis把ResultSet集合映射成POJO的接口对象。我们可以定义插件对Mybatis的结果集自动映射进行修改。







插件Interceptor







Mybatis的插件实现要实现Interceptor接口，我们看下这个接口定义的方法。






    
    <code>public interface Interceptor {   
       Object intercept(Invocation invocation) throws Throwable;       
       Object plugin(Object target);    
       void setProperties(Properties properties);
    }
    </code>







这个接口只声明了三个方法：







setProperties方法是在Mybatis进行配置插件的时候可以配置自定义相关属性，即：接口实现对象的参数配置。







plugin方法是插件用于封装目标对象的，通过该方法我们可以返回目标对象本身，也可以返回一个它的代理，可以决定是否要进行拦截进而决定要返回一个什么样的目标对象，官方提供了示例：return Plugin.wrap(target, this)。







intercept方法就是要进行拦截的时候要执行的方法。







理解这个接口的定义，先要知道java动态代理机制。plugin接口即返回参数target对象(Executor/ParameterHandler/ResultSetHander/StatementHandler)的代理对象。在调用对应对象的接口的时候，可以进行拦截并处理。







Mybatis四大接口对象创建方法







Mybatis的插件是采用对四大接口的对象生成动态代理对象的方法来实现的。那么现在我们看下Mybatis是怎么创建这四大接口对象的。






    
    <code>public Executor newExecutor(Transaction transaction, ExecutorType executorType) {
       <em>//确保ExecutorType不为空(defaultExecutorType有可能为空)</em>
       executorType = executorType == null ? defaultExecutorType : executorType;
       executorType = executorType == null ? ExecutorType.SIMPLE : executorType;
       Executor executor;   if (ExecutorType.BATCH == executorType) {
          executor = new BatchExecutor(this, transaction);
       } else if (ExecutorType.REUSE == executorType) {
          executor = new ReuseExecutor(this, transaction);
       } else {
          executor = new SimpleExecutor(this, transaction);
       }   if (cacheEnabled) {
          executor = new CachingExecutor(executor);
       }
       executor = (Executor) interceptorChain.pluginAll(executor);
       return executor;
    }
    
    public StatementHandler newStatementHandler(Executor executor, MappedStatement mappedStatement, Object parameterObject, RowBounds rowBounds, ResultHandler resultHandler, BoundSql boundSql) {
       StatementHandler statementHandler = new RoutingStatementHandler(executor, mappedStatement, parameterObject, rowBounds, resultHandler, boundSql);
       statementHandler = (StatementHandler) interceptorChain.pluginAll(statementHandler);
       return statementHandler;
    }
    
    public ParameterHandler newParameterHandler(MappedStatement mappedStatement, Object parameterObject, BoundSql boundSql) {
       ParameterHandler parameterHandler = mappedStatement.getLang().createParameterHandler(mappedStatement, parameterObject, boundSql);
       parameterHandler = (ParameterHandler) interceptorChain.pluginAll(parameterHandler);
       return parameterHandler;
    }
    
    public ResultSetHandler newResultSetHandler(Executor executor, MappedStatement mappedStatement, RowBounds rowBounds, ParameterHandler parameterHandler, ResultHandler resultHandler, BoundSql boundSql) {
       ResultSetHandler resultSetHandler = new DefaultResultSetHandler(executor, mappedStatement, parameterHandler, resultHandler, boundSql, rowBounds);
       resultSetHandler = (ResultSetHandler) interceptorChain.pluginAll(resultSetHandler);
       return resultSetHandler;
    }
    </code>







查看源码可以发现， Mybatis框架在创建好这四大接口对象的实例后，都会调用InterceptorChain.pluginAll()方法。InterceptorChain对象是插件执行链对象，看源码就知道里面维护了Mybatis配置的所有插件(Interceptor)对象。






    
    <code>Executor/ParameterHandler/ResultSetHander/StatementHandler
    public Object pluginAll(Object target) {
    for (Interceptor interceptor : interceptors) {  
        target = interceptor.plugin(target);
      }
       return target;
    }</code>







其实就是按顺序执行我们插件的plugin方法，一层一层返回我们原对象(Executor/ParameterHandler/ResultSetHander/StatementHandler)的代理对象。当我们调用四大接口的方法的时候，实际上是调用代理对象的相应方法，代理对象又会调用四大接口的实例。







Plugin对象







我们知道，官方推荐插件实现plugin方法为：Plugin.wrap(target, this);












    
    <code>public static Object wrap(Object target, Interceptor interceptor) {
    // 获取插件的Intercepts注解
    Map, Set> signatureMap = getSignatureMap(interceptor);
    Class<?> type = target.getClass();
    Class<?>[] interfaces = getAllInterfaces(type, signatureMap);
    if (interfaces.length > 0) {  
      return Proxy.newProxyInstance(type.getClassLoader(), interfaces, new Plugin(target, interceptor, signatureMap));
    }
      return target;
    }</code>







这个方法其实是Mybatis简化我们插件实现的工具方法。其实就是根据当前拦截的对象创建了一个动态代理对象。代理对象的InvocationHandler处理器为新建的Plugin对象。







插件配置注解@Intercepts







Mybatis的插件都要有Intercepts注解来指定要拦截哪个对象的哪个方法。我们知道，Plugin.warp方法会返回四大接口对象的代理对象(通过new Plugin()创建的IvocationHandler处理器)，会拦截所有的执行方法。在代理对象执行对应方法的时候，会调用InvocationHandler处理器的invoke方法。Mybatis中利用了注解的方式配置指定拦截哪些方法。具体如下：






    
    <code>public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    try {  
      Set<Method> methods = signatureMap.get(method.getDeclaringClass());
      if (methods != null && methods.contains(method)) <em>{
         return interceptor.intercept(new Invocation(target, method, args));
      }</em>
      return method.invoke(target, args);
    } catch (Exception e) {
      throw ExceptionUtil.unwrapThrowable(e);
    }
    }</code>







可以看到，只有通过Intercepts注解指定的方法才会执行我们自定义插件的intercept方法。未通过Intercepts注解指定的将不会执行我们的intercept方法。







官方插件开发方式






    
    <code>@Intercepts({@Signature(type = Executor.class, method = "query",    
    args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class})})
    public class TestInterceptor implements Interceptor {
    public Object intercept(Invocation invocation) throws Throwable { 
    Object target = invocation.getTarget(); <em>//被代理对象</em>
    Method method = invocation.getMethod(); <em>//代理方法</em>
    Object[] args = invocation.getArgs(); <em>//方法参数</em>
     <em>// do something ...... 方法拦截前执行代码块</em>
    Object result = invocation.proceed();
     <em>// do something .......方法拦截后执行代码块</em>
    return result;
    }
    public Object plugin(Object target) {
     return Plugin.wrap(target, this);
    }
    }</code>







以上就是Mybatis官方推荐的插件实现的方法，通过Plugin对象创建被代理对象的动态代理对象。可以发现，Mybatis的插件开发还是很简单的。







自定义开发方式







Mybatis的插件开发通过内部提供的Plugin对象可以很简单的开发。只有理解了插件实现原理，对应不采用Plugin对象我们一样可以自己实现插件的开发。下面是我个人理解之后的自己实现的一种方式。






    
    <code>public class TestInterceptor implements Interceptor {
    public Object intercept(Invocation invocation) throws Throwable {
        Object target = invocation.getTarget(); <em>//被代理对象</em>
        Method method = invocation.getMethod(); <em>//代理方法</em>
        Object[] args = invocation.getArgs(); <em>//方法参数</em>
        <em>// do something ...... 方法拦截前执行代码块</em>
        Object result = invocation.proceed();
        <em>// do something .......方法拦截后执行代码块</em>
        return result;
    }
    public Object plugin(final Object target) {
        return Proxy.newProxyInstance(Interceptor.class.getClassLoader(), target.getClass().getInterfaces(), new InvocationHandler() {
            public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
                return intercept(new Invocation(target, method, args));
            }
        });
    }
    public void setProperties(Properties properties) {
    }
    }</code>







当然，Mybatis插件的那这个时候Intercepts的注解起不到作用了。







小结







我们在MyBatis配置了一个插件，在运行发生了什么







所有可能被拦截的处理类都会生成一个代理







处理类代理在执行对应方法时，判断要不要执行插件中的拦截方法







执行插接中的拦截方法后，推进目标的执行







如果有N个插件，就有N个代理，每个代理都要执行上面的逻辑。这里面的层层代理要多次生成动态代理，是比较影响性能的。虽然能指定插件拦截的位置，但这个是在执行方法时动态判断，初始化的时候就是简单的把插件包装到了所有可以拦截的地方。







因此，在编写插件时需注意以下几个原则：







不编写不必要的插件；







实现plugin方法时判断一下目标类型，是本插件要拦截的对象才执行Plugin.wrap方法，否者直接返回目标本身，这样可以减少目标被代理的次数。







_// 假如我们只要拦截Executor对象，那么我们应该这么做_












    
    <code>public Object plugin(final Object target) {
    if (target instanceof Executor) {  
      return Plugin.wrap(target, this);
    } else {
      return target;
    }
    }</code>







Mybatis插件很强大，可以对Mybatis框架进行很大的扩展。当然，如果你不理解Mybatis插件的原理，开发起来只能是模拟两可。在实际开发过程中，我们可以参考别人写的插件。下面是一个Mybatis分页的插件，可以为以后开发做参考。






    
    <code>/**
    Mybatis - 通用分页插件（如果开启二级缓存需要注意）
    */
    @Intercepts({@Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class})
    @Signature(type = ResultSetHandler.class, method = "handleResultSets", args = {Statement.class})})
    @Log4j
    public class PageHelper implements Interceptor {
    public static final ThreadLocal<Page> localPage = new ThreadLocal<Page>();
    
    <em>/**
     * 开始分页
     *
     * @param pageNum
     * @param pageSize
     */</em>
    public static void startPage(int pageNum, int pageSize) {
        localPage.set(new Page(pageNum, pageSize));
    }
    
    <em>/**
     * 结束分页并返回结果，该方法必须被调用，否则localPage会一直保存下去，直到下一次startPage
     *
     * @return
     */</em>
    public static Page endPage() {
        Page page = localPage.get();
        localPage.remove();
        return page;
    }
    
    public Object intercept(Invocation invocation) throws Throwable {
        if (localPage.get() == null) {
            return invocation.proceed();
        }
        if (invocation.getTarget() instanceof StatementHandler) {
            StatementHandler statementHandler = (StatementHandler) invocation.getTarget();
            MetaObject metaStatementHandler = SystemMetaObject.forObject(statementHandler);
            <em>// 分离代理对象链(由于目标类可能被多个插件拦截，从而形成多次代理，通过下面的两次循环</em>
            <em>// 可以分离出最原始的的目标类)</em>
            while (metaStatementHandler.hasGetter("h")) {
                Object object = metaStatementHandler.getValue("h");
                metaStatementHandler = SystemMetaObject.forObject(object);
            }
            <em>// 分离最后一个代理对象的目标类</em>
            while (metaStatementHandler.hasGetter("target")) {
                Object object = metaStatementHandler.getValue("target");
                metaStatementHandler = SystemMetaObject.forObject(object);
            }
            MappedStatement mappedStatement = (MappedStatement) metaStatementHandler.getValue("delegate.mappedStatement");
            <em>//分页信息if (localPage.get() != null) {</em>
            Page page = localPage.get();
            BoundSql boundSql = (BoundSql) metaStatementHandler.getValue("delegate.boundSql");
            <em>// 分页参数作为参数对象parameterObject的一个属性</em>
            String sql = boundSql.getSql();
            <em>// 重写sql</em>
            String pageSql = buildPageSql(sql, page);
            <em>//重写分页sql</em>
            metaStatementHandler.setValue("delegate.boundSql.sql", pageSql);
            Connection connection = (Connection) invocation.getArgs()[0];
            <em>// 重设分页参数里的总页数等</em>
            setPageParameter(sql, connection, mappedStatement, boundSql, page);
            <em>// 将执行权交给下一个插件</em>
            return invocation.proceed();
        } else if (invocation.getTarget() instanceof ResultSetHandler) {
            Object result = invocation.proceed();
            Page page = localPage.get();
            page.setResult((List) result);
            return result;
        }
        return null;
    }
    
    <em>/**
     * 只拦截这两种类型的
     * <br>StatementHandler
     * <br>ResultSetHandler
     *
     * @param target
     * @return
     */</em>
    public Object plugin(Object target) {
        if (target instanceof StatementHandler || target instanceof ResultSetHandler) {
            return Plugin.wrap(target, this);
        } else {
            return target;
        }
    }
    
    public void setProperties(Properties properties) {
    
    }
    
    <em>/**
     * 修改原SQL为分页SQL
     *
     * @param sql
     * @param page
     * @return
     */</em>
    private String buildPageSql(String sql, Page page) {
        StringBuilder pageSql = new StringBuilder(200);
        pageSql.append("select * from (");
        pageSql.append(sql);
        pageSql.append(" ) temp limit ").append(page.getStartRow());
        pageSql.append(" , ").append(page.getPageSize());
        return pageSql.toString();
    }
    
    <em>/**
     * 获取总记录数
     *
     * @param sql
     * @param connection
     * @param mappedStatement
     * @param boundSql
     * @param page
     */</em>
    private void setPageParameter(String sql, Connection connection, MappedStatement mappedStatement,
                                  BoundSql boundSql, Page page) {
        <em>// 记录总记录数</em>
        String countSql = "select count(0) from (" + sql + ") temp";
        PreparedStatement countStmt = null;
        ResultSet rs = null;
        try {
            countStmt = connection.prepareStatement(countSql);
            BoundSql countBS = new BoundSql(mappedStatement.getConfiguration(), countSql,
                    boundSql.getParameterMappings(), boundSql.getParameterObject());
            setParameters(countStmt, mappedStatement, countBS, boundSql.getParameterObject());
            rs = countStmt.executeQuery();
            int totalCount = 0;
            if (rs.next()) {
                totalCount = rs.getInt(1);
            }
            page.setTotal(totalCount);
            int totalPage = totalCount / page.getPageSize() + ((totalCount % page.getPageSize() == 0) ? 0 : 1);
            page.setPages(totalPage);
        } catch (SQLException e) {
            log.error("Ignore this exception", e);
        } finally {
            try {
                rs.close();
            } catch (SQLException e) {
                log.error("Ignore this exception", e);
            }
            try {
                countStmt.close();
            } catch (SQLException e) {
                log.error("Ignore this exception", e);
            }
        }
    }
    
    <em>/**
     * 代入参数值
     *
     * @param ps
     * @param mappedStatement
     * @param boundSql
     * @param parameterObject
     * @throws SQLException
     */</em>
    private void setParameters(PreparedStatement ps, MappedStatement mappedStatement, BoundSql boundSql,
                               Object parameterObject) throws SQLException {
        ParameterHandler parameterHandler = new DefaultParameterHandler(mappedStatement, parameterObject, boundSql);
        parameterHandler.setParameters(ps);
    }
    
    @Data <em>//采用lombok插件编译</em>
    public static class Page<E> {
        private int pageNum;
        private int pageSize;
        private int startRow;
        private int endRow;
        private long total;
        private int pages;
        private List<E> result;
    
        public Page(int pageNum, int pageSize) {
            this.pageNum = pageNum;
            this.pageSize = pageSize;
            this.startRow = pageNum > 0 ? (pageNum - 1) * pageSize : 0;
            this.endRow = pageNum * pageSize;
        }
    
    }
    }</code>







原文发布时间为：2018-07-03  
本文作者：曹金桂







原文链接：[https://developer.aliyun.com/article/607022#:~:text=Mybatis%E6%8F%92%E4%BB%B6%E6%9C%BA%E5%88%B6%E8%AF%A6%E8%A7%A3-%E9%98%BF%E9%87%8C%E4%BA%91%E5%BC%80%E5%8F%91%E8%80%85%E7%A4%BE%E5%8C%BA.,Mybatis%E9%87%87%E7%94%A8%E8%B4%A3%E4%BB%BB%E9%93%BE%E6%A8%A1%E5%BC%8F%EF%BC%8C%E9%80%9A%E8%BF%87%E5%8A%A8%E6%80%81%E4%BB%A3%E7%90%86%E7%BB%84%E7%BB%87%E5%A4%9A%E4%B8%AA%E6%8F%92%E4%BB%B6%EF%BC%88%E6%8B%A6%E6%88%AA%E5%99%A8%EF%BC%89%EF%BC%8C%E9%80%9A%E8%BF%87%E8%BF%99%E4%BA%9B%E6%8F%92%E4%BB%B6%E5%8F%AF%E4%BB%A5%E6%94%B9%E5%8F%98Mybatis%E7%9A%84%E9%BB%98%E8%AE%A4%E8%A1%8C%E4%B8%BA%EF%BC%88%E8%AF%B8%E5%A6%82SQL%E9%87%8D%E5%86%99%E4%B9%8B%E7%B1%BB%E7%9A%84%EF%BC%89%EF%BC%8C%E7%94%B1%E4%BA%8E%E6%8F%92%E4%BB%B6%E4%BC%9A%E6%B7%B1%E5%85%A5%E5%88%B0Mybatis%E7%9A%84%E6%A0%B8%E5%BF%83%EF%BC%8C%E5%9B%A0%E6%AD%A4%E5%9C%A8%E7%BC%96%E5%86%99%E8%87%AA%E5%B7%B1%E7%9A%84%E6%8F%92%E4%BB%B6%E5%89%8D%E6%9C%80%E5%A5%BD%E4%BA%86%E8%A7%A3%E4%B8%8B%E5%AE%83%E7%9A%84%E5%8E%9F%E7%90%86%EF%BC%8C%E4%BB%A5%E4%BE%BF%E5%86%99%E5%87%BA%E5%AE%89%E5%85%A8%E9%AB%98%E6%95%88%E7%9A%84%E6%8F%92%E4%BB%B6%E3%80%82.%20Mybatis%E6%8F%92%E4%BB%B6%E6%9C%BA%E5%88%B6%E8%AF%A6%E8%A7%A3-%E9%98%BF%E9%87%8C%E4%BA%91%E5%BC%80%E5%8F%91%E8%80%85%E7%A4%BE%E5%8C%BA.](https://developer.aliyun.com/article/607022#:~:text=Mybatis%E6%8F%92%E4%BB%B6%E6%9C%BA%E5%88%B6%E8%AF%A6%E8%A7%A3-%E9%98%BF%E9%87%8C%E4%BA%91%E5%BC%80%E5%8F%91%E8%80%85%E7%A4%BE%E5%8C%BA.,Mybatis%E9%87%87%E7%94%A8%E8%B4%A3%E4%BB%BB%E9%93%BE%E6%A8%A1%E5%BC%8F%EF%BC%8C%E9%80%9A%E8%BF%87%E5%8A%A8%E6%80%81%E4%BB%A3%E7%90%86%E7%BB%84%E7%BB%87%E5%A4%9A%E4%B8%AA%E6%8F%92%E4%BB%B6%EF%BC%88%E6%8B%A6%E6%88%AA%E5%99%A8%EF%BC%89%EF%BC%8C%E9%80%9A%E8%BF%87%E8%BF%99%E4%BA%9B%E6%8F%92%E4%BB%B6%E5%8F%AF%E4%BB%A5%E6%94%B9%E5%8F%98Mybatis%E7%9A%84%E9%BB%98%E8%AE%A4%E8%A1%8C%E4%B8%BA%EF%BC%88%E8%AF%B8%E5%A6%82SQL%E9%87%8D%E5%86%99%E4%B9%8B%E7%B1%BB%E7%9A%84%EF%BC%89%EF%BC%8C%E7%94%B1%E4%BA%8E%E6%8F%92%E4%BB%B6%E4%BC%9A%E6%B7%B1%E5%85%A5%E5%88%B0Mybatis%E7%9A%84%E6%A0%B8%E5%BF%83%EF%BC%8C%E5%9B%A0%E6%AD%A4%E5%9C%A8%E7%BC%96%E5%86%99%E8%87%AA%E5%B7%B1%E7%9A%84%E6%8F%92%E4%BB%B6%E5%89%8D%E6%9C%80%E5%A5%BD%E4%BA%86%E8%A7%A3%E4%B8%8B%E5%AE%83%E7%9A%84%E5%8E%9F%E7%90%86%EF%BC%8C%E4%BB%A5%E4%BE%BF%E5%86%99%E5%87%BA%E5%AE%89%E5%85%A8%E9%AB%98%E6%95%88%E7%9A%84%E6%8F%92%E4%BB%B6%E3%80%82.%20Mybatis%E6%8F%92%E4%BB%B6%E6%9C%BA%E5%88%B6%E8%AF%A6%E8%A7%A3-%E9%98%BF%E9%87%8C%E4%BA%91%E5%BC%80%E5%8F%91%E8%80%85%E7%A4%BE%E5%8C%BA.)



