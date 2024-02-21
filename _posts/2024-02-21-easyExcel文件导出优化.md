---
author: meow
comments: true
title: Java 使用EasyExcel导出工具类（实体类，非实体类，List＜Map＜String,Object＞＞）
categories:
- 后端
tags:
- java
- EasyExcel
- 文件导出
---

## 1. 引用主要工具类pom.xml

```xml

        <dependency>
            <groupId>com.alibaba</groupId>
            <artifactId>easyexcel-core</artifactId>
            <version>3.3.2</version>
            <scope>compile</scope>
        </dependency>

```

## 2. 定义实体条件组装对象

1. NoModelWriteData 对象 动态表头
- 不使用导出对象进行数据映射导出excel文件

```java

import lombok.Data;
import java.io.Serializable;
import java.util.List;
import java.util.Map;

@Data
public class NoModelWriteData implements Serializable {
    private String fileName;//文件名
    private String[] headArray;//表头数组
    private String[] dataStrArray;//对应数据字段数组
    private List<Map> dataListMap;//数据集合
}

```
2. SimpleWriteData 对象 固态表头

```java

import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Data
public class SimpleWriteData implements Serializable {
    private String fileName;//文件名
    private List<Map> dataListMap;//数据列表
}
```

3. Excel文档的自动列宽设置

```java

/**
 * Excel文档的自动列宽设置策略
 */
public class ExcelWidthStyleStrategy extends AbstractColumnWidthStyleStrategy {
    // 最大列宽
    private static final int MAX_COLUMN_WIDTH = 255;
    // 列宽的倍数
    private static final int COLUMN_WIDTH = 2;
    // 缓存列宽信息
    private final Map<Integer, Map<Integer, Integer>> CACHE = new HashMap<>(8);

    /**
     * 设置列宽
     *
     * @param writeSheetHolder   WriteSheetHolder对象
     * @param cellDataList       单元格数据列表
     * @param cell               单元格对象
     * @param head               表头对象
     * @param relativeRowIndex   相对行索引
     * @param isHead             是否表头
     */
    @Override
    protected void setColumnWidth(WriteSheetHolder writeSheetHolder, List<WriteCellData<?>> cellDataList, Cell cell, Head head, Integer relativeRowIndex, Boolean isHead) {
        boolean needSetWidth = isHead || !cellDataList.isEmpty();
        if (needSetWidth) {
            Map<Integer, Integer> maxColumnWidthMap = CACHE.get(writeSheetHolder.getSheetNo());
            if (maxColumnWidthMap == null) {
                maxColumnWidthMap = new HashMap<>(16);
                CACHE.put(writeSheetHolder.getSheetNo(), maxColumnWidthMap);
            }

            Integer columnWidth = calculateColumnWidth(cellDataList, cell, isHead);
            if (columnWidth >= 0) {
                if (columnWidth > MAX_COLUMN_WIDTH) {
                    columnWidth = MAX_COLUMN_WIDTH;
                } else {
                    if (columnWidth < COLUMN_WIDTH) {
                        columnWidth *= COLUMN_WIDTH;
                    }
                }

                Integer maxColumnWidth = maxColumnWidthMap.get(cell.getColumnIndex());
                if (maxColumnWidth == null || columnWidth > maxColumnWidth) {
                    maxColumnWidthMap.put(cell.getColumnIndex(), columnWidth);
                    writeSheetHolder.getSheet().setColumnWidth(cell.getColumnIndex(), columnWidth * 256);
                }
            }
        }
    }

    /**
     * 计算数据的长度，用于设置列宽
     *
     * @param cellDataList 单元格数据列表
     * @param cell         单元格对象
     * @param isHead       是否表头
     * @return 数据长度
     */
    private Integer calculateColumnWidth(List<WriteCellData<?>> cellDataList, Cell cell, Boolean isHead) {
        if (isHead) {
            return cell.getStringCellValue().getBytes().length;
        } else {
            WriteCellData cellData = cellDataList.get(0);
            CellDataTypeEnum type = cellData.getType();
            if (type == null) {
                return -1;
            } else {
                switch (type) {
                    case STRING:
                        return cellData.getStringValue().getBytes().length;
                    case BOOLEAN:
                        return cellData.getBooleanValue().toString().getBytes().length;
                    case NUMBER:
                        return cellData.getNumberValue().toString().getBytes().length;
                    default:
                        return -1;
                }
            }
        }
    }

    /**
     * 获取单元格样式策略
     *
     * @return 单元格样式策略
     */
    public static HorizontalCellStyleStrategy getStyleStrategy() {
        // 头部样式
        WriteCellStyle headWriteCellStyle = new WriteCellStyle();
        // 设置背景颜色为灰色
        headWriteCellStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        WriteFont headWriteFont = new WriteFont();
        // 设置字体样式
        headWriteFont.setFontName("Frozen");
        headWriteFont.setFontHeightInPoints((short) 12);
        headWriteFont.setBold(true);
        headWriteCellStyle.setWriteFont(headWriteFont);
        // 设置是否自动换行
        headWriteCellStyle.setWrapped(false);
        // 设置水平对齐方式
        headWriteCellStyle.setHorizontalAlignment(HorizontalAlignment.CENTER);
        // 设置垂直对齐方式
        headWriteCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        // 内容样式
        WriteCellStyle contentWriteCellStyle = new WriteCellStyle();
        // 设置背景颜色为白色
        contentWriteCellStyle.setFillForegroundColor(IndexedColors.WHITE.getIndex());
        WriteFont contentWriteFont = new WriteFont();
        // 设置字体大小
        contentWriteFont.setFontHeightInPoints((short) 12);
        // 设置字体样式
        contentWriteFont.setFontName("Calibri");
        contentWriteCellStyle.setWriteFont(contentWriteFont);
        // 返回水平样式策略，头部样式和内容样式分开设置
        return new HorizontalCellStyleStrategy(headWriteCellStyle, contentWriteCellStyle);
    }
}

```

4. EasyExcelUtils 工具类

```java

public class EasyExcelUtils {

    //不创建对象的导出
    public void noModleWrite(@RequestBody NoModelWriteData data, HttpServletResponse response) throws IOException {
        try {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setCharacterEncoding("utf-8");
            String fileName = URLEncoder.encode(data.getFileName(), "UTF-8").replaceAll("\\+", "%20");
            response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");
            EasyExcel.write(response.getOutputStream()).head(head(data.getHeadArray())).registerWriteHandler(new ExcelWidthStyleStrategy()).registerWriteHandler(ExcelWidthStyleStrategy.getStyleStrategy()).sheet(data.getFileName()).doWrite(dataList(data.getDataListMap(), data.getDataStrArray()));
        }catch (Exception e) {
        // 重置response
        response.reset();
        response.setContentType("application/json");
        response.setCharacterEncoding("utf-8");
        Map<String, String> map = new HashMap<String, String>();
        map.put("status", "failure");
        map.put("message", "下载文件失败" + e.getMessage());
        response.getWriter().println(JSON.toJSONString(map));
        }
    }

    //创建对象的导出
    public <T> void simpleWrite(@RequestBody SimpleWriteData data, Class<T> clazz, HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        // 这里URLEncoder.encode可以防止中文乱码 当然和easyexcel没有关系
        String fileName = URLEncoder.encode(data.getFileName(), "UTF-8");
        response.setHeader("Content-disposition", "attachment;filename=" + fileName + ".xlsx");
        EasyExcel.write(response.getOutputStream(), clazz).sheet(data.getFileName()).doWrite(data.getDataListMap());
    }

    //设置表头
    private List<List<String>> head(String[] headMap) {
        List<List<String>> list = new ArrayList<List<String>>();
        for (String head : headMap) {
            List<String> headList = new ArrayList<String>();
            headList.add(head);
            list.add(headList);
        }
        return list;
    }

    //设置导出的数据内容
    private List<List<Object>> dataList(List<Map<String, Object>> dataList, String[] dataStrMap) {
        List<List<Object>> list = new ArrayList<List<Object>>();
        for (Map<String, Object> map : dataList) {
            List<Object> data = new ArrayList<Object>();
            for (int i = 0; i < dataStrMap.length; i++) {
                data.add(map.get(dataStrMap[i]));
            }
            list.add(data);
        }
        return list;
    }
}

```
## 3.调用示例
### 动态表头导出,不使用实体类导出
1. 查询List<Map<String,Object>>类型数据
2. 定义数组
   - headMap数组定义的是导出文件表头标题的内容，要按顺序定义
   - dataStrMap数据定义的是标题对应的字段名（一定要按顺序对应）
   - eg:

   ```java

   String[] headMap = { "年龄", "性别" };
   String[] dataStrMap={"age","sex"};

    ```
3. 组装数据调用

```java

NoModelWriteData d = new NoModelWriteData();
d.setFileName("测试导出");
d.setHeadArray(headArray);
d.setDataStrArray(dataStrArray);
d.setDataListMap(listDatasMap);
EasyExcelUtils easyExcelUtils = new EasyExcelUtils();
easyExcelUtils.noModleWrite(d, response);

```
### 使用实体类导出

1. 定义数据实体类

- 实体类中的注解可以根据自己的需求使用，更多注解可查看文章开头的官方示例文档

```java
@Data
public class TestExportDto implements Serializable {
    @ExcelProperty("年龄")
    private Integer age;
    @ExcelProperty("性别")
    private String sex;

//    @ExcelIgnore    此注解表示忽略这个字段
//    @DateTimeFormat("yyyy年MM月dd日HH时mm分ss秒")  时间格式化注解
//    @NumberFormat("#.##%")  百分比表示
//    @ColumnWidth(50)   设置单元格宽度为50
//    @ExcelProperty(value = "标题", index = 0)   第0列为标题列

}

```

2. 将数据放入工具类方法的实体类中

```java

SimpleWriteData d = new SimpleWriteData();
d.setFileName("测试导出");
d.setDataListMap(list);
EasyExcelUtils easyExcelUtils = new EasyExcelUtils();
easyExcelUtils.simpleWrite(d,TestExportDto.class,response);

```
## 4.参考文档

1. https://www.yuque.com/easyexcel/doc/easyexcel (EasyExcel 官网)
2. https://blog.csdn.net/weixin_44811578/article/details/107101248 （Excel文档的字体，背景色，自动列宽的设置参考）
3. https://www.cnblogs.com/October-28/p/15686452.html (原文地址)




