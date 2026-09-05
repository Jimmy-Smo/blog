---
title: SOAP 报文参数顺序写反，服务端拿到的是 null
description: SOAP 报文里参数顺序写反导致服务端拿到 null，从 CXF 源码追到 XSD xsd:sequence 的顺序约束。
date: 2021-09-06
updated: 2026-09-05
tags:
  - java
  - webservice
status: versioned
draft: true
---

对接方调一个 WebService 接口，进来了，打印出来的两个参数都是空。把报文要过来，改了命名空间，再把两个参数的顺序调正，就通了。对方问：这两个参数为什么一定要按顺序？当时只能说不按顺序就会出问题。后来打断点看了 CXF 怎么解析 SOAP。

![xsd:sequence 规定子元素只能按声明顺序出现](https://img.jimmy42x.com/images/2026/09/java/soap-wsdl-parameter-order/xsd-sequence-cover.4ba97d84.webp)

## 先说结论

这个接口是 Dubbo 的 WebService 协议，底层委托给 CXF。WSDL 用 XSD 的 `xsd:sequence` 声明入参，子元素必须按声明顺序出现。对方把 `arg0` 和 `arg1` 写反了，CXF 对不上名字就把当前参数填成 `null`，真正的 `arg0` 被跳过去。

当时用的是 `cxf-api` 2.6.1。

## CXF 怎么把 SOAP 参数读进来

Dubbo 的 WS 协议也是交给 CXF 的 `ServletController` 处理。参数是在 `org.apache.cxf.interceptor.DocLiteralInInterceptor.getPara(...)` 里解析的。我后来在 CXF 官网的 2.4、2.6、3.1 API 里都没搜到这个方法名，可能是这个版本私有。

![DocLiteralInInterceptor 调试现场](https://img.jimmy42x.com/images/2026/09/java/soap-wsdl-parameter-order/cxf-docliteralininterceptor-debug.14963c2b.webp)

```java
    private void getPara(DepthXMLStreamReader xmlReader,
                         DataReader<XMLStreamReader> dr,
                         MessageContentsList parameters,
                         Iterator<MessagePartInfo> itr,
                         Message message) {

        boolean hasNext = true;
        while (itr.hasNext()) {
            MessagePartInfo part = itr.next();
            if (hasNext) {
                hasNext = StaxUtils.toNextElement(xmlReader);
            }
            Object obj = null;
            if (hasNext) {
                QName rname = xmlReader.getName();
                while (part != null
                    && !rname.equals(part.getConcreteName())) {
                    if (part.getXmlSchema() instanceof XmlSchemaElement) {
                        //TODO - should check minOccurs=0 and throw validation exception
                        //thing if the part needs to be here
                        parameters.put(part, null);
                    }

                    if (itr.hasNext()) {
                        part = itr.next();
                    } else {
                        part = null;
                    }
                }
                if (part == null) {
                    return;
                }
                if (rname.equals(part.getConcreteName())) {
                    obj = dr.read(part, xmlReader);
                }
            }
            parameters.put(part, obj);
        }
    }
```

`MessagePartInfo` 是从 WSDL 里解析出来的约定参数，`rname` 是报文里实际读到的元素名。第一次循环时 `part` 指向 `arg0`，报文第一个元素却是 `arg1`，名字对不上，就 `parameters.put(part, null)`。接着 `part` 取到 `arg1`，这次对上了，把值读进来。迭代器里两个元素走完，报文里真正的 `arg0` 就被跳过去了。

对方报文大概是这样（命名空间已替换）：

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.xxx">
    <soapenv:Header/>
    <soapenv:Body>
        <ser:syncunitework>
            <ser:arg1>arg1</ser:arg1>
            <ser:arg0>arg0</ser:arg0>
        </ser:syncunitework>
    </soapenv:Body>
</soapenv:Envelope>
```

WSDL 里对应的入参片段：

```xml
<xsd:element name="sync" type="tns:sync"/>
<xsd:complexType name="sync">
  <xsd:sequence>
    <xsd:element minOccurs="0" name="arg0" type="xsd:string"/>
    <xsd:element minOccurs="0" name="arg1" type="xsd:string"/>
  </xsd:sequence>
</xsd:complexType>
```

## 顺序从哪来的

CXF 自己的概述只说它能讲 SOAP、XML/HTTP、REST 这些协议。真正约束顺序的是 XML Schema：`xsd:sequence` 规定子元素必须按声明顺序出现；如果写成 `xsd:all`，才可以任意顺序。Stack Overflow 上也是这么区分的。

所以归根到底不是 Dubbo 或 CXF 另搞了一套，是 WSDL 用了 `xsd:sequence`。

## 参考

- Dubbo WebService 协议说明：<https://dubbo.gitbooks.io/dubbo-user-book/content/references/protocol/webservice.html>
- Apache CXF Overview：<http://cxf.apache.org/docs/overview.html>
- XML Schema `sequence`：<https://www.w3schools.com/xml/el_sequence.asp>
- [Difference between xsd:all and xsd:sequence](https://stackoverflow.com/questions/16101488/difference-between-xsdall-and-xsdsequence-in-schema-definition)
- 2021 年原文：<https://www.cnblogs.com/Jimmy-cnblog/p/15235380.html>
