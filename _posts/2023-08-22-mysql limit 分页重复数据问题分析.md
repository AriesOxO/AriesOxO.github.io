---
author: meow
comments: true
title: [mysql] Limit分页重复数据问题分析
categories:
- 后端
- 数据库
tags:
- mysql
- 分页
- limit
---
## 问题原因
- 在进行一次数据导出的过程中，发现导出的数据包含重复数据，sql查询使用group进行分组子查询
  之后再使用limit进行分组。业务上需要联表可能会出现重复数据，在单表上进行测试，分组根据唯一索引进行数据分组，
测试数据保证数据唯一。<br>
- 问题sql如下：
```sql
SELECT
  *
FROM
    ( SELECT * FROM testTable GROUP BY testKey ) test
  LIMIT 100,20
```
SQL获取testTable表中的数据并且根据testKey去重复，最后再获取分页数据的数据。验证过程中发现，使用distinct
去重复数据再分页问题依旧。<br>
- 问题SQL如下：
```sql
	SELECT
	*
FROM
	( SELECT DISTINCT testKey FROM testTable GROUP BY testKey ) test
	LIMIT 100,5
```

## 问题分析
MySQL LIMIT 子句简介
limit：子句用于select中，对输出结果集的行数进行约束，limit接收2个参数，但通常只用一个，两个参数都是整型数字。

<br>以下是两个参数的说明：

```sql
SELECT
column1,column2,...
FROM
table
LIMIT offset , count;
```
<br>参数:
<br>The offset 是返回集的初始标注，起始点是0，不是1哦
- 在google查找一番之后，limit分页数据不保证数据唯一，也就是在分页的过程中，由于顺序的不确定性可能会导致
将已经分页过的数据再次分页到新的数据集之中，可以保证当前分页数据集唯一，但是将每一个数据集也就是页数据汇总之后，会发现
其中包含有重复数据。呐如何解决这个问题呢？

## 问题解决
- limit获取按照不同的数据间距获取不同长度的数据，之所以重复是因为顺序不稳定，在确定顺序之后再去分页，呐这个问题就解决了
，上面的需求，第一步先去重,group by 或者 distinct,然后再进行order by 排序，排序字段必须唯一，最后再分页
即可。
- <br>参考sql：
```sql
SELECT
  *
FROM
    ( SELECT * FROM testTable GROUP BY testKey ) test
ORDER BY
  test.testKey
  LIMIT 100,5
```
## [参考文章](https://zhuanlan.zhihu.com/p/359315847#:~:text=MySQL%E4%BD%BF%E7%94%A8limit%E8%BF%9B%E8%A1%8C%E5%88%86%E9%A1%B5%E6%9F%A5%E8%AF%A2%E6%97%B6%EF%BC%8C%E5%8F%AF%E8%83%BD%E4%BC%9A%E5%87%BA%E7%8E%B0%E9%87%8D%E5%A4%8D%E6%95%B0%E6%8D%AE%EF%BC%8C%E5%8F%AF%E4%BB%A5%E9%80%9A%E8%BF%87%E5%8A%A0%E4%B8%8Aorder%20by%E5%AD%90%E5%8F%A5%E5%B9%B6%E4%BF%9D%E8%AF%81%E6%8E%92%E5%BA%8F%E5%AD%97%E6%AE%B5%E7%9A%84%E5%94%AF%E4%B8%80%E6%80%A7%E6%9D%A5%E8%A7%A3%E5%86%B3%E3%80%82,%E7%BC%96%E8%BE%91%E4%BA%8E%202021-03-24%2018%3A25)
