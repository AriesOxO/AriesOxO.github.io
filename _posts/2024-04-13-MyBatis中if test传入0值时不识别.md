---
author: meow
comments: true
title: MyBatis中if test传入0值时不识别
categories:
- 后端
tags:
- MyBatis
- xml
---

## 前言
本文会写一些探究以及解决问题的过程。如果只想看解决方案请使用导航栏跳转到相应位置。

## 问题描述&分析
使用了MyBatis做多条件查询，其中有一个参数是astatus，当前端给的值为1时，查询结果正常。而给0时，这个查询语句就不会被拼接使用，具体请接着看。

### OperatingAccountDao.xml

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0 /EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.demo.dao.OperatingAccountDao">
    <select id="getOperationalAccountByMultipleConditions" resultType="OperatingAccount"
            parameterType="com.example.demo.bean.OperatingAccount">
        select * from oat
        <where>
            <if test="username != null and username != ''">
                and username like concat('%',#{username},'%')
            </if>
            <if test="userid != null and userid != ''">
                and userid = #{userid}
            </if>
            <if test="sex != null and sex != ''">
                and sex in ${sex}
            </if>
            <if test="astatus != null and astatus != '' ">
                and astatus = #{astatus}
            </if>
        </where>
    </select>
</mapper>
```
查询代码如上，本文我们只需要关注这三行代码，重点是第一行。这三行的代码意思是，如果astatus这个值不为null并且不为空字符串，则将and astatus = #{astatus}这句话加入到查询语句中。

```xml
<if test="astatus != null and astatus != '' ">
    and astatus = #{astatus}
</if>
```
现在发送一个请求，4个参数的值分别为{sex=2, astatus=1, userid=, username=}，sex=2是查找全部性别，userid和username为空字符串。通过控制台可以看到astatus的值为1，数据库接收到1个Integer参数，值为1，SQL语句中也拼接正常，查询正确。
然后再发一次请求，这次4个参数中，只有astatus的值由1变为了0，而控制台中显示数据库没有接收到参数，SQL语句拼接异常，查询错误。预期中，查询语句应该是select * from oat WHERE sex in ('M', 'F') and astatus = ?，其中参数应该为0。而实际上控制台看到的结果却是没有把and astatus = #{astatus}拼接出来，更不解的是参数没取到。

- 我的推测是：0不是空字符串，所以0可能是被当做null处理了。
通过查找资料，查到org.apache.ibatis.scripting.xmltags.IfSqlNode这个类，该类用来处理动态SQL的节点，方法public boolean apply(DynamicContext context)用来构造节点内的SQL语句。
if (evaluator.evaluateBoolean(test, context.getBindings())便是解析<if test="astatus != null and astatus !='' ">表达式的关键，如果表达式为true则拼接SQL，否则忽略。

```xml
public boolean apply(DynamicContext context) {
    if (this.evaluator.evaluateBoolean(this.test, context.getBindings())) {
        this.contents.apply(context);
        return true;
    } else {
        return false;
    }
}
```
顺藤摸瓜，找到了evaluateBoolean方法所在的类org.apache.ibatis.scripting.xmltags，源代码如下：

```xml

public boolean evaluateBoolean(String expression, Object parameterObject) {
    Object value = OgnlCache.getValue(expression, parameterObject);
    if (value instanceof Boolean) {
        return (Boolean) value;
    } else if (value instanceof Number) {
        return (new BigDecimal(String.valueOf(value))).compareTo(BigDecimal.ZERO) != 0;
    } else {
        return value != null;
    }
}
```
通过上述代码第五行得知，当传入的参数是number类型（比如Integer），它就会拿这个参数的值跟0做比较，最终evaluateBoolean方法会返回false，随后apply方法也会返回false，因此表达式<if test="astatus != null and astatus != '' ">被忽略了。
除了这点，观察到这行代码Object value = OgnlCache.getValue(expression, parameterObject);，又得益于查到的资料，我知道了解析表达式使用的是OGNL，也就是说，MyBatis的表达式是用OGNL来处理的。而OGNL的官网上有这么一段说明：

Interpreting Objects as Booleans

Any object can be used where a boolean is required. OGNL interprets objects as booleans like this:

- If the object is a Boolean, its value is extracted and returned;
- If the object is a Number, its double-precision floating-point value is compared with zero; non-zero is treated as true, zero as false;
- If the object is a Character, its boolean value is true if and only if its char value is non-zero;
- Otherwise, its boolean value is true if and only if it is non-null.

机翻一下： 将对象解释为布尔值 任何对象都可以在需要布尔值的地方使用。OGNL解释对象作为布尔值如下：
  - 如果对象是布尔型，则提取并返回其值；
  - 如果对象是一个数字，则将其双精度浮点值与零进行比较；非零被视为真，零被视为假；
  - 如果对象是一个字符，当且仅当其字符值为非零时，其布尔值为真；
  - 否则，当且仅当它是非null的时候，它的布尔值为true。

## 结论&解决方案
我的猜测错了，0并没有被当做null处理。0实际上先是被转成双精度浮点值，也就是0.00，然后与0比较。0.00等于0吗？是，则视为真，处理（拼接）表达式；否，则视为假，不处理（也就是不拼接）表达式。

解决方案非常简单，加多一个判断条件astatus == 0即可，推荐加在第一个判断条件。因为当值为0时，判断第一次就为真，所以后续不需要再判断是否为空值或者空字符串了，算是一个小小的优化叭~（虽然猜测错了，但是这次探寻下来还是有收获的）

```xml
<if test="astatus == 0 or astatus != null and astatus != '' ">
```

## 参考资料
[1] [mybatis 中 if-test 判断大坑](https://www.cnblogs.com/grasp/p/11268049.html)<br>
[2] [MyBatis中if test传入0值时不识别 ](https://www.cnblogs.com/ast935478677/p/14351414.html)
