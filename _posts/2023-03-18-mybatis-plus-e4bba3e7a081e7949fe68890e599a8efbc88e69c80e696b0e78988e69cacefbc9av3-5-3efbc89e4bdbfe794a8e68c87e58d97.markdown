---
author: meow
comments: true
date: 2023-03-18 12:22:04+00:00
link: http://121.40.199.110/index.php/2023/03/18/mybatis-plus-%e4%bb%a3%e7%a0%81%e7%94%9f%e6%88%90%e5%99%a8%ef%bc%88%e6%9c%80%e6%96%b0%e7%89%88%e6%9c%ac%ef%bc%9av3-5-3%ef%bc%89%e4%bd%bf%e7%94%a8%e6%8c%87%e5%8d%97/
slug: mybatis-plus-%e4%bb%a3%e7%a0%81%e7%94%9f%e6%88%90%e5%99%a8%ef%bc%88%e6%9c%80%e6%96%b0%e7%89%88%e6%9c%ac%ef%bc%9av3-5-3%ef%bc%89%e4%bd%bf%e7%94%a8%e6%8c%87%e5%8d%97
title: MyBatis Plus 代码生成器（最新版本：V3.5.3）使用指南
wordpress_id: 235
categories:
- 编程
tags:
- MyBatis plus
---




## 官方文档









  * [快速入门](https://baomidou.com/pages/779a6e/)





  * [代码生成器配置（新）](https://baomidou.com/pages/981406/#%E6%95%B0%E6%8D%AE%E5%BA%93%E9%85%8D%E7%BD%AE-datasourceconfig)







## 示例项目技术栈









  * spring boot 2.7.4





  * mybatis 3.5.9





  * mybatis plus 3.5.2





  * mybatis plus generator 3.5.3





  * mysql 8





  * velocity 2.3





  * hutool 5.8.8





  * lombok 1.2.11







示例程序选择的技术都是目前为止的最新版本。







## 示例项目创建步骤







### 1、创建测试数据表







**建表脚本：**







    <code>DROP TABLE IF EXISTS `sys_menu`;
    CREATE TABLE `sys_menu`  (
      `menu_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
      `pid` bigint COMMENT '上级菜单ID',
      `sub_count` int NULL DEFAULT 0 COMMENT '子菜单数目',
      `type` int COMMENT '菜单类型',
      `title` varchar(255)  COMMENT '菜单标题',
      `name` varchar(255)  COMMENT '组件名称',
      `component` varchar(255)  COMMENT '组件',
      `menu_sort` int COMMENT '排序',
      `icon` varchar(255)  COMMENT '图标',
      `path` varchar(255)  COMMENT '链接地址',
      `i_frame` bit(1) COMMENT '是否外链',
      `cache` bit(1) NULL DEFAULT b'0' COMMENT '缓存',
      `hidden` bit(1) NULL DEFAULT b'0' COMMENT '隐藏',
      `permission` varchar(255) COMMENT '权限',
      `create_by` varchar(255) COMMENT '创建者',
      `update_by` varchar(255) COMMENT '更新者',
      `create_time` datetime(0) COMMENT '创建日期',
      `update_time` datetime(0) COMMENT '更新时间',
      PRIMARY KEY (`menu_id`) USING BTREE,
      UNIQUE INDEX `uniq_title`(`title`) USING BTREE,
      UNIQUE INDEX `uniq_name`(`name`) USING BTREE,
      INDEX `inx_pid`(`pid`) USING BTREE
    ) ENGINE = InnoDB AUTO_INCREMENT = 116 CHARACTER SET = utf8 COLLATE = utf8_general_ci COMMENT = '系统菜单' ROW_FORMAT = COMPACT;
    复制代码</code>







### 2、创建一个 Spring Boot 项目







创建一个 Spring Boot 项目，在`pom.xml`文件中引入如下依赖：







    <code><dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.mybatis.spring.boot</groupId>
            <artifactId>mybatis-spring-boot-starter</artifactId>
            <version>2.2.2</version>
        </dependency>

        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-boot-starter</artifactId>
            <version>3.5.2</version>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-generator</artifactId>
            <version>3.5.3</version>
        </dependency>

        <dependency>
            <groupId>org.apache.velocity</groupId>
            <artifactId>velocity-engine-core</artifactId>
            <version>2.3</version>
        </dependency>

        <dependency>
            <groupId>cn.hutool</groupId>
            <artifactId>hutool-all</artifactId>
            <version>5.8.8</version>
        </dependency>

        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
        </dependency>

    </dependencies>
    复制代码</code>







MyBatis Plus Generator支持的模板引擎有Velocity、Beetl、FreeMarker，笔者这里选择的是MyBatis Plus Generator默认的模板引擎 —— Velocity。







### 2、创建代码生成器启动类







**数据源配置**







    <code>FastAutoGenerator
        // 配置数据源
        .create("jdbc:mysql://127.0.0.1:3306/eladmin?characterEncoding=UTF-8&useUnicode=true&useSSL=false", "root", "123456")
        // 全局配置
        .globalConfig( ... )
        // 包配置
        .packageConfig( ... )
        // 策略配置
        .strategyConfig( ... )
        // 执行
        .execute();
    复制代码</code>







**全局配置**







    <code>FastAutoGenerator
        // 配置数据源
        .create("jdbc:mysql://127.0.0.1:3306/eladmin?characterEncoding=UTF-8&useUnicode=true&useSSL=false", "root", "123456")
        // 全局配置
        .globalConfig(builder -> {
            builder.author("wanggc") // 设置作者
                .commentDate("yyyy-MM-dd hh:mm:ss")   // 注释日期
                .outputDir(System.getProperty("user.dir") + "/src/main/java") // 指定输出目录
                .disableOpenDir() //禁止打开输出目录，默认打开
            ;
        })
        // 包配置
        .packageConfig( ... )
        // 策略配置
        .strategyConfig( ... )
        // 执行
        .execute();
    复制代码</code>







笔者在全局配置中配置了作者名称、代码注释中日期格式、生成文件存储目录，生成代码完成后会默认打开输出目录，笔者感觉没必要，这里就禁止打开输出目录了。







**包配置**







    <code>FastAutoGenerator
        // 配置数据源
        .create("jdbc:mysql://127.0.0.1:3306/eladmin?characterEncoding=UTF-8&useUnicode=true&useSSL=false", "root", "123456")
        // 全局配置
        .globalConfig( ... )
        // 包配置
        // 包配置
        .packageConfig(builder -> {
            builder.parent("demo.generator") // 设置父包名
                .pathInfo(Collections.singletonMap(OutputFile.xml, System.getProperty("user.dir") + "/src/main/resources/mappers")); // 设置mapperXml生成路径
        })
        // 策略配置
        .strategyConfig( ... )
        // 执行
        .execute();
    复制代码</code>







在包配置中，笔者配置了父包名，配置了mybatis mapper文件存储路径。在包配置中是可以配置 Entity 包名、Mapper 包名、Service 包名、Controller 包名的，笔者这里没有这个需求，就没有配置。







**策略配置**







    <code>FastAutoGenerator
        // 配置数据源
        .create("jdbc:mysql://127.0.0.1:3306/eladmin?characterEncoding=UTF-8&useUnicode=true&useSSL=false", "root", "123456")
        // 全局配置
        .globalConfig( ... )
        // 包配置
        .packageConfig( ... )
        // 策略配置
        .strategyConfig(builder -> {
            builder.addInclude("sys_menu") // 设置需要生成的表名
                .addTablePrefix("sys_") // 设置过滤表前缀
                // Entity 策略配置
                .entityBuilder()
                .enableLombok() //开启 Lombok
                .enableFileOverride() // 覆盖已生成文件
                .naming(NamingStrategy.underline_to_camel)  //数据库表映射到实体的命名策略：下划线转驼峰命
                .columnNaming(NamingStrategy.underline_to_camel)    //数据库表字段映射到实体的命名策略：下划线转驼峰命
                // Mapper 策略配置
                .mapperBuilder()
                .enableFileOverride() // 覆盖已生成文件
                // Service 策略配置
                .serviceBuilder()
                .enableFileOverride() // 覆盖已生成文件
                .formatServiceFileName("%sService") //格式化 service 接口文件名称，%s进行匹配表名，如 UserService
                .formatServiceImplFileName("%sServiceImpl") //格式化 service 实现类文件名称，%s进行匹配表名，如 UserServiceImpl
                // Controller 策略配置
                .controllerBuilder()
                .enableFileOverride() // 覆盖已生成文件
            ;
        })
        // 执行
        .execute();
    复制代码</code>







在策略配置中，笔者配置了需要生成的表名、过滤表前缀、开启 Lombok、覆盖已生成文件、下划线转驼峰命、Service 接口文件及实现类的文件名。







**代码生成器启动类完整代码**







完整的代码生成器启动类 —— `CodeGenerator.java` —— 内容如下：







    <code>package demo.generator;

    import com.baomidou.mybatisplus.generator.FastAutoGenerator;
    import com.baomidou.mybatisplus.generator.config.OutputFile;
    import com.baomidou.mybatisplus.generator.config.rules.NamingStrategy;

    import java.util.Collections;

    public class CodeGenerator {
        public static void main(String[] args) {
            FastAutoGenerator.create("jdbc:mysql://127.0.0.1:3306/eladmin?characterEncoding=UTF-8&useUnicode=true&useSSL=false", "root", "abc123")
                    // 全局配置
                    .globalConfig(builder -> {
                        builder.author("wanggc") // 设置作者
                                .commentDate("yyyy-MM-dd hh:mm:ss")   //注释日期
                                .outputDir(System.getProperty("user.dir") + "/src/main/java") // 指定输出目录
                                .disableOpenDir() //禁止打开输出目录，默认打开
                        ;
                    })
                    // 包配置
                    .packageConfig(builder -> {
                        builder.parent("demo.generator") // 设置父包名
                                .pathInfo(Collections.singletonMap(OutputFile.xml, System.getProperty("user.dir") + "/src/main/resources/mappers")); // 设置mapperXml生成路径
                    })
                    // 策略配置
                    .strategyConfig(builder -> {
                        builder.addInclude("sys_menu") // 设置需要生成的表名
                                .addTablePrefix("sys_") // 设置过滤表前缀
                                // Entity 策略配置
                                .entityBuilder()
                                .enableLombok() //开启 Lombok
                                .enableFileOverride() // 覆盖已生成文件
                                .naming(NamingStrategy.underline_to_camel)  //数据库表映射到实体的命名策略：下划线转驼峰命
                                .columnNaming(NamingStrategy.underline_to_camel)    //数据库表字段映射到实体的命名策略：下划线转驼峰命
                                // Mapper 策略配置
                                .mapperBuilder()
                                .enableFileOverride() // 覆盖已生成文件
                                // Service 策略配置
                                .serviceBuilder()
                                .enableFileOverride() // 覆盖已生成文件
                                .formatServiceFileName("%sService") //格式化 service 接口文件名称，%s进行匹配表名，如 UserService
                                .formatServiceImplFileName("%sServiceImpl") //格式化 service 实现类文件名称，%s进行匹配表名，如 UserServiceImpl
                                // Controller 策略配置
                                .controllerBuilder()
                                .enableFileOverride() // 覆盖已生成文件
                        ;
                    })
                    .execute();

        }
    }
    复制代码</code>







注意：全局配置中的用于覆盖已生成文件的方法`fileOverride`在当前版本中已过时，官方文档中目前还未更新。笔者查源码了解到当前版本配置覆盖已生成文件的方法是在策略配置中使用`enableFileOverride`方法。 配置方式可以看上面的代码。与之前版本不同的是，现在配置Entity、Mapper、Service、Controller覆盖已生成文件需要单独配置，而不是像之前一样只配置一处，所有已生成的文件都会被覆盖。







**效果图**





![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb57f80c3fa941c3922775f57d688c39~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp)





## 后记







MyBatis Plus Generator 根据默认模板生成的代码是比较简单的，在实际的应用中需要根据自身需要编写代码模板







作者：嗨皮汪小成
链接：https://juejin.cn/post/7153855035896512526
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。



