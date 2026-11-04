# 原版＋图片背景（上一版归档）

当前版本见[历史、配乐与船坞版](history-music-refit.md)。以下说明仅描述上一版，不代表当前功能。

基线为 c1a8fe8，即用户“四点历史航程改造要求”之前的版本。后续实验仍保存在 feat/history-and-progression 分支；未采用的 v10 改动保存在本地 stash 中。

本版只增加16座原故事岛的图片背景资料。靠近岛屿，点「图片背景 · 人物名」查看；用 Escape 或「收起，继续航行」返回，再沿原玩法按E与人物交谈。图片附作者、来源、许可与说明，区分后世画像、示意图、现代照片和历史图像。

原人物、场景、故事、字幕、对话和水上玩法不改；阅读不发放奖励、不收取补给、不推进章节。

验证：`node scripts/check-original-backgrounds.mjs` 核对16个入口、素材及14个核心文件与基线逐字一致。`scripts/check-background-browser.mjs` 使用独立测试API检查第一岛的图片打开/关闭、手机宽度、资源/进度不变，以及原人物与字幕继续显示。未跑完整航程，未录制Demo。

构建：`VITE_API_BASE=/api npm run build --prefix apps/web`。

桌面更新：`python3 scripts/install-background-build.py`。安装前备份前端、场景数据和SQLite；恢复基线场景内容时保留已有版本，以免删除已有航程引用。关闭图片窗会回到当前游戏，不重开存档。

本版中英文演讲初稿与五人分工由 `scripts/build-background-presentation.py` 生成。属于可编辑初版；商业内容为待验证方向，不声称付费模型调用、营收或已完成完整通关。

D场景配置沿用原桌面已有的D1，并与历史改造前的安装快照逐字段核对后补入仓库，没有另写剧情。
