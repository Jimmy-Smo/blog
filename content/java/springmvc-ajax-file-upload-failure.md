---
title: "Spring MVC + Ajax 上传文件失败：jQuery 1.4 还不认 contentType: false"
description: "jQuery 1.4 的 $.ajax 不支持 contentType: false，导致 multipart 请求头非法；记录一次用 Fiddler 和 Postman 比对报文的排查过程。"
date: 2021-07-29
updated: 2026-09-05
tags:
  - java
  - spring-mvc
  - jquery
  - http
  - debugging
status: versioned
draft: true
---

第一次写文件上传，工程里也没有现成代码可以抄。按网上教程写完，跑起来不是 500 就是 400。500 时后台抛的是：

`org.springframework.web.multipart.MultipartException: The current request is not a multipart request`

## 先说结论

网上那套 `contentType: false` 的 Ajax 写法，要 jQuery 1.6 才认。工程用的是 1.4，浏览器发出去的 `Content-Type` 变成了 `false,multipart/form-data;boundary=...`，这是非法 token。Spring 用 `startsWith("multipart/")` 判断，当然过不去。

Postman 用 form-data 能打到 Controller，说明后台没问题。Fiddler 一对比，差的就是请求头。

## 网上的标准写法

前端把 form 放进 `FormData`，Ajax 这样写：

```html
<script type="text/javascript">
    $(function () {
        $("input[type='button']").click(function () {
            var formData = new FormData($("#upForm")[0]);
            $.ajax({
                type: "post",
                url: "${pageContext.request.contextPath}/upfile/upload",
                data: formData,
                cache: false,
                processData: false,
                contentType: false,
                success: function (data) {
                    alert(data);
                },
                error: function (response) {
                    console.log(response);
                    alert("上传失败");
                }
            });
        });
    });
</script>
<body>
    <form id="upForm" method="post" enctype="multipart/form-data">
        用户名：<input type="text" name="userName" id="userName" /><br/>
        密码：<input type="password" name="pwd" id="pwd" /><br/>
        <input type="file" name="image"><br/>
        <input type="button" value="提交" />
    </form>
</body>
```

Spring MVC 这边配 Commons 的上传解析器：

```xml
<bean id="multipartResolver" class="org.springframework.web.multipart.commons.CommonsMultipartResolver">
   <property name="defaultEncoding">
      <value>UTF-8</value>
   </property>
   <property name="maxUploadSize">
      <value>32505856</value><!-- 31 * 1024 * 1024 -->
   </property>
   <property name="maxInMemorySize">
      <value>4096</value>
   </property>
</bean>
```

Controller：

```java
@Controller
@RequestMapping("/upfile")
public class UpFileController {
    @RequestMapping("/upload")
    @ResponseBody
    public String getMsg(UserTest user, @RequestParam("image") CommonsMultipartFile file){
        System.out.println(user.getUserName());
        System.out.println(file.getOriginalFilename());
        return "接收成功";
    }
}
```

换了好几篇博文，写法都差不多。我这边跑完还是 500，或者参数对不上变成 400。把 Controller 收成只收文件，就一直停在 500。

## 用 Postman 和 Fiddler 找差异

请教同事之后，先用 Postman 打了一枪：Body 选 form-data，填 key、选文件，请求进了 Controller。后台逻辑没问题。

再用 Fiddler 对比成功和失败两次请求。方法、路径、协议版本一样。Headers 里差在 `Content-Type`：Ajax 发出去的是 `false,multipart/form-data;boundary=...`，Postman 成功的是正常的 `multipart/form-data;boundary=...`。Body 里文件那一段的 `Content-Type`，成功的是 `text/x-java-source`，失败的是 `application/octet-stream`。

![Fiddler 里成功请求的报文](https://img.jimmy42x.com/images/2026/09/java/springmvc-ajax-file-upload-failure/fiddler-successful-request.f5d495a2.webp)

差异找到了，接下来就想让 Ajax 发出去的报文跟成功的一致。`FormData` 没有设置 Content-Type 的地方。把 `contentType: false` 改成 `multipart/form-data`，报文还是对不上。又回头改后台参数，希望它能把这份非法报文解析掉，当然还是失败。当时没好好看异常那一行：Spring 判断 Content-Type 用的是 `startsWith`。

后来把 Postman 里文件那段的 Content-Type 也改成 `application/octet-stream`，Postman 照样成功。再比一次，还是 Headers 里那句 `false,multipart/form-data;...`。这才去看 Spring 抛异常的地方：

```java
    private void assertIsMultipartRequest(HttpServletRequest request) {
        String contentType = request.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("multipart/")) {
            throw new MultipartException("The current request is not a multipart request");
        }
    }
```

报文必须是 `multipart` 开头。Ajax 把字面量 `false` 拼进了头里，自然过不去。

## jQuery 文档里写着版本

jQuery 的 [`$.ajax`](https://api.jquery.com/jquery.ajax/) 文档写得很清楚：

```plaintext
contentType (default: 'application/x-www-form-urlencoded; charset=UTF-8')
Type: Boolean or String
When sending data to the server, use this content type. Default is "application/x-www-form-urlencoded; charset=UTF-8", which is fine for most cases.
If you explicitly pass in a content-type to $.ajax(), then it is always sent to the server (even if no data is sent).
As of jQuery 1.6 you can pass false to tell jQuery to not set any content type header.
```

要 1.6 及以上。工程用的是 1.4。换一份高版本 jQuery 过来，请求头就变成正常的 `multipart/form-data;boundary=...` 了。

`false` 这个字符本身也不合法。Spring 在 `MediaType.checkToken` 里会按 RFC 2616 第 2.2 节扫 token，碰到非法字符直接抛：

```java
    private void checkToken(String s) {
        for (int i=0; i < s.length(); i++ ) {
            char ch = s.charAt(i);
            if (!TOKEN.get(ch)) {
                throw new IllegalArgumentException("Invalid token character '" + ch + "' in token \"" + s + "\"");
            }
        }
    }
```

![MDN 上的 Content-Type 说明](https://img.jimmy42x.com/images/2026/09/java/springmvc-ajax-file-upload-failure/mdn-content-type-header.bdbc1af0.webp)

## 这次排障留下的几条

先换一种调用方式。一开始就用 Postman，能先确认后台是对的。

抄代码时核对版本。浏览器、jQuery、Spring 和教程不是同一代，写法看起来一样，行为不一样。

看框架抛错的那一行。网上都说是 `multipart/form-data` 的问题，我一开始以为头里只要包含这串字就行。

看官方 API，不要只搜「Ajax 上传文件」。`contentType: false` 这个参数是后来才加的，教程很少写版本。

`Content-Type` 的 token 字符集是有规定的，`false` 这种拼进去就是非法头。MDN：[Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)。

## 参考

- jQuery `$.ajax`：<https://api.jquery.com/jquery.ajax/>
- MDN Content-Type：<https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type>
- 2021 年原文：<https://www.cnblogs.com/Jimmy-cnblog/p/15074546.html>
