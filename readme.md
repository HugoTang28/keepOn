# 坚持号（keepOn）

一个基于 `uni-app`（Vue 3）实现的学习打卡应用，支持在指定打卡点范围内完成签到、签退，并展示连续打卡天数、周打卡情况及历史记录。

## 功能特性

- 微信登录：在微信小程序端通过 `uni.login` 与 `uni.getUserProfile` 获取用户信息，支持昵称头像补充录入。
- 位置打卡：通过 `uni.getLocation` 获取当前位置，使用 Haversine 算法计算与打卡点的距离，默认范围为 300 米。
- 自定义打卡点：可填写名称、经纬度，或使用当前位置作为打卡点，并支持恢复默认位置。
- 签到与签退：
  - 06:00 起可签到，08:00 后签到记为迟到。
  - 18:00 前签退记为早退；次日 00:00–06:00 的签退仍归属前一天考勤。
  - 已完成当天考勤后，06:00 前仍可更新签退时间。
- 数据统计：展示连续打卡天数、本周打卡进度、本月打卡和累计打卡次数。
- 记录查看：按月份分组展示打卡记录，支持折叠，并标记正常、迟到、早退和未签退状态。
- 账号隔离：打卡记录按用户昵称分别存储在本地缓存中，退出登录后不会展示上一个账号的数据。

## 技术栈

- `uni-app` + Vue 3
- `uview-plus` 组件库
- SCSS
- `uni.getLocation`（GCJ-02 坐标）
- 本地缓存 `uni.getStorageSync` / `uni.setStorageSync`

## 项目结构

```text
keepOn/
├── components/            # 自定义组件
│   └── my/                # 个人信息相关组件
├── pages/                 # 页面
│   ├── home/              # 首页与打卡
│   ├── record/            # 打卡记录
│   └── my/                # 个人中心与打卡点设置
├── static/                # 静态资源
├── store/                 # 状态管理目录
├── uni_modules/           # uni-app 模块
├── uniCloud-aliyun/       # uniCloud 云函数与数据库目录
├── utils/                 # 通用工具与定位逻辑
├── App.vue
├── main.js
├── manifest.json          # 应用配置及各端 AppID
├── pages.json             # 页面路由、导航栏与 tabBar 配置
├── uni.scss
└── package.json
```

## 本地运行

1. 安装依赖：

   ```bash
   npm install
   ```

2. 使用 HBuilderX 打开项目根目录，选择“运行到微信小程序”或其他目标平台。当前 `package.json` 未配置 npm scripts，推荐使用 HBuilderX 进行运行和发行。

3. 微信小程序运行前，请在 `manifest.json` 中配置真实的微信小程序 AppID，并确认已开启位置权限。`manifest.json` 中已声明：

   - `scope.userLocation` 用途说明
   - `requiredPrivateInfos: ["getLocation"]`

4. 首次进入首页时会自动定位；也可以点击“重新定位”刷新位置。只有距离打卡点不超过 300 米且已登录时才能打卡。

5. 在“我的 → 打卡点设置”中可以修改打卡点。默认打卡点为仲恺农业工程学院（海珠校区）。

## 定位说明

- 小程序端使用 `gcj02` 坐标，与打卡点坐标一致。
- H5 端需要在 HTTPS 环境下访问，并按平台要求配置地图相关服务。
- App 端需要开启系统定位开关并授予应用定位权限。
- 定位失败时，首页会展示具体原因及排查提示。

## 数据说明

当前版本的用户信息和打卡记录均保存在设备本地，未接入云端同步。清除应用缓存或卸载应用会导致数据丢失。

主要缓存键：

| 键名 | 用途 |
| --- | --- |
| `keepon_user` | 当前登录用户的昵称和头像 |
| `keepon_checkin_target` | 自定义打卡点 |
| `keepon_checkin_records::<账号>` | 按账号隔离的打卡记录 |
