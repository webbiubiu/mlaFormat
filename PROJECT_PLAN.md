# MLA格式检测网站项目文档

## 项目概述

一个全前端MLA格式检测网站，用户上传DOCX/PDF文档，自动检测是否符合MLA标准。所有检测在客户端进行，保护用户隐私。

## 核心需求

- **隐私优先**：所有处理在客户端完成，文档不上传服务器
- **格式检测**：自动检测MLA标准合规性
- **可视化报告**：高亮问题区域，提供详细分析
- **跨平台兼容**：支持主流浏览器，响应式设计

## 技术架构

### 前端技术栈
```
Next.js 15 + App Router - React框架
TypeScript - 类型安全
Tailwind CSS + shadcn/ui - UI样式
Zustand - 状态管理
```

### 核心依赖库
```
JSZip - DOCX文件解压
xml2js - XML解析
pdf.js - PDF解析(阶段4实现)
mammoth.js - DOCX到HTML转换(文档预览)
```

### 浏览器兼容性
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 项目结构

```
mlaformat/
├── components/
│   ├── DocumentUpload/     # 文档上传组件
│   ├── DocumentViewer/     # 文档预览器(带高亮)
│   ├── ReportPanel/        # 分析报告面板
│   ├── AnalysisEngine/     # 检测引擎组件
│   └── ui/                 # shadcn/ui组件
├── lib/
│   ├── docx-parser.ts      # DOCX解析器
│   ├── mla-rules.ts        # MLA规则引擎
│   ├── report-generator.ts # 报告生成器
│   └── utils.ts            # 工具函数
├── app/
│   ├── page.tsx            # 主页面
│   ├── layout.tsx          # 根布局
│   └── globals.css         # 全局样式
└── public/                 # 静态资源
```

## 核心功能模块

### 1. 文档解析模块
- **DOCX解析**: JSZip + DOMParser
  - 解压DOCX文件
  - 解析word/document.xml (内容结构)
  - 解析word/styles.xml (样式信息)
  - 解析word/settings.xml (页面设置)
- **PDF解析**: pdf.js (future)

### 2. MLA检测规则

#### 页面格式
- 页边距：上下左右各1英寸
- 字体：Times New Roman 12pt
- 行间距：双倍行距
- 页码：右上角，"姓名 页码"格式

#### 文本格式
- 段落首行缩进：0.5英寸
- 标题居中，无额外格式
- 引文格式检测

#### 参考文献
- Works Cited页面
- 按字母顺序排列
- 悬挂缩进格式

### 3. 报告生成模块

#### 可视化报告
- 文档预览 + 问题高亮
- 颜色编码：
  - 🔴 红色：不符合项
  - 🟡 黄色：警告项
  - 🟢 绿色：符合项

#### 详细分析
- 问题分类统计
- 具体错误描述
- 修改建议
- 符合度评分

## 开发计划

### 阶段1: 基础框架
- [x] Next.js项目初始化
- [x] shadcn/ui集成
- [ ] 基础UI组件开发

### 阶段2: 核心功能
- [ ] DOCX解析器开发
- [ ] MLA规则引擎
- [ ] 报告生成器

### 阶段3: 用户体验
- [ ] 文档预览器
- [ ] 交互式报告
- [ ] 响应式设计

### 阶段4: 优化扩展
- [ ] 性能优化
- [ ] 错误处理
- [ ] PDF支持
- [ ] 多语言支持

## 部署方案

### 静态部署
- cloudflare

### 优势
- 零成本部署
- 全球CDN加速
- 自动HTTPS
- 持续集成

## 技术亮点

1. **完全前端处理** - 保护用户隐私
2. **深度格式分析** - 直接解析DOCX XML结构
3. **可视化反馈** - 直观的问题定位
4. **现代化UI** - shadcn/ui + Tailwind CSS
5. **性能优化** - Next.js静态优化

## 未来扩展

### 功能扩展
- APA、Chicago等其他格式支持
- 批量文档检测
- 模板下载功能
- 导出报告(PDF)

### 商业化
- 高级检测功能
- 教育机构API
- 白标解决方案
- 用户数据分析

---

*项目开始时间: 2025-09-22*
*预计完成时间: 待定*