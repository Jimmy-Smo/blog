---
title: 一条日历触发器如何让整台 Mac 收不到通知
description: usernoted 长期占满一个核、同时所有 App 的通知全部消失，根因是第三方日历写进系统通知库的重复触发器钉死了年份。记录抓栈定位、双层 bplist 解码和清理过程，并附一个两天后出现在同一台机器上、根因模式相同的 dasd 案例。
date: 2026-09-18
updated: 2026-09-20
topic: engineering
tags: []
status: versioned
draft: false
---

活动监视器里 `usernoted` 稳定占着 96% 的 CPU，风扇不停，电量掉得比平时快，电源偏好里还写着「程序正在阻止系统睡眠」。更奇怪的是这台机器已经大半天没弹出过任何通知：不是某个 App 的通知不见了，是全部，连短信和日历提醒一起没了。

重启解决了三分钟。新进程起来不到一分钟，CPU 又回到 96%。

## 先说结论

- CPU 满载和收不到通知是同一个故障的两张脸。`usernoted` 在一条串行队列上处理通知，一条算不出下次触发时间的记录卡在队头，后面所有 App 的通知都发不出去。
- 病根是第三方日历 App 写进系统通知库的重复触发器：日期分量里钉死了年份，同时又把 repeats 标成 true。这类记录存在系统库里，卸载 App 不会清掉，重启更不会。
- 定位靠 `sample` 抓栈，不靠猜「哪个 App 在刷通知」。方向反了就一步都走不下去。

## 症状比看上去更统一

面对这种情况，最自然的假设是两个独立故障：某个进程失控吃 CPU，另外通知设置可能被误关。于是先去翻系统设置的通知开关，再逐个 App 排查，结果什么都查不出来。

真正的线索是这两件事必须一起解释。`usernoted` 是 macOS 的通知中心守护进程，所有 App 的本地通知请求最终都由它排期和投递。如果它忙到没空干活，表现恰恰不是「通知变慢」，而是通知彻底不动。这个方向一旦想通，问题就从「谁在刷通知」变成了「它到底卡在哪一行代码上」，而后者是可以直接测量的。

## 栈里写着答案

`sample` 是 macOS 自带的采样器，对着 PID 采几秒就能给出按调用栈聚合的热点，不需要符号表也不需要停进程：

```bash
sample $(pgrep -x usernoted) 3 -f /tmp/usernoted.sample
```

结果里有价值的是两行。一行是队列名：

```text
Thread_13238   DispatchQueue_32: usernoted_server  (serial)
```

另一行是栈顶附近的调用：

```text
-[UNNotificationTrigger nextTriggerDateAfterLastTriggerDate:withRequestedDate:]
  -[UNCalendarNotificationTrigger nextTriggerDateAfterDate:withRequestedDate:]
    _NSSwiftCalendar.nextDate(after:matching:options:)
      Calendar._enumerateDatesStep(...)
```

`UNCalendarNotificationTrigger` 是通知框架里按日历时间触发的触发器，给它一组日期分量（月、日、时、分等），它负责算出下一次该在什么时候响。栈说明这个计算就是热点。

而 `serial` 这个词把第二个症状也解释掉了。串行队列一次只跑一个任务，队头阻塞会传染给后面所有人。所以不是通知丢了，是全部排在这条算不完的记录后面出不来。「阻止系统睡眠」同理，是进程持续满载的副作用，不是它主动申请了什么。

## 通知库里存的是两层归档

待触发的通知记录存在一个 SQLite 库里，路径是 `~/Library/Group Containers/group.com.apple.usernoted/db2/db`。

读它有个前提：`usernoted` 常驻持有这个库并开着 WAL（预写日志，新写入先进 `db-wal` 再合并回主库）。所以要用 `mode=ro` 打开，而不是 `immutable=1`。后者会让 SQLite 假定文件不再变化从而跳过 WAL，读到的是上一个检查点的旧内容，排查时看到的和进程正在处理的对不上。

```bash
sqlite3 "file:$HOME/Library/Group Containers/group.com.apple.usernoted/db2/db?mode=ro" \
  "SELECT a.identifier, COUNT(*) FROM record r JOIN app a ON a.app_id=r.app_id GROUP BY 1 ORDER BY 2 DESC;"
```

麻烦在于 `record.data` 不是可读字段，而是一段二进制 plist。把它解开之后，日期分量又藏在 `req.trig.datc` 里，那是**套在里面的第二层归档**，格式是 `NSKeyedArchiver` 输出的扁平对象数组，字段之间靠 UID 互相指。也就是说要解两次 plist，第二次还要自己跟着 UID 跳转才能读出日历标识符。

解码要跑一个小脚本。不带参数时按 App 统计记录数，带上 bundle id 时把该 App 的日历触发器全部解成一张表。

## 十二条清明节

解出来的表里，某个日历 App 占了 47 条记录，其中十二条标题都是「清明节」：

```text
   rec title       cal            y   m   d    rep
 19445 清明节       gregorian   2026   4   5   True
 19440 清明节       gregorian   2027   4   5   True
 19465 清明节       gregorian   2028   4   4   True
 ...
 19482 清明节       gregorian   2036   4   4   True
```

同一个节日为什么要写十二条，而不是一条「每年 4 月 5 日」？因为清明是节气，不是固定日期。它由太阳到达黄经 15 度的时刻决定，落在公历上每年在 4 月 4 日和 4 月 5 日之间漂移。日历触发器的日期分量表达不了这种规则，开发者只能为每一年单独写一条。

问题出在这些记录同时带着 `repeats: true`。重复触发器的语义是「求下一次匹配」，而分量里一旦钉死了 `year`，符合条件的时间点就只剩唯一一个。这两种语义放在一起是自相矛盾的，而矛盾在那个时间点过去之后就会变成事实：表里 2026 年 4 月 5 日那两条，在排查当天（2026 年 9 月）早已过期，永远不会再有「下一次」。

值得留意的是这类 bug 的触发条件带时间性。App 装好的头几个月一切正常，直到硬编码的第一个日期过去，故障才出现，这让人很难把它和任何一次安装或升级关联起来。

## 一个被测量推翻的假设

看到栈里的 `Calendar._enumerateDatesStep`，很容易得出一个解释：`nextDate(after:matching:)` 的实现是向前逐日枚举，遇到永远匹配不上的条件就会一直枚举下去，CPU 就是这么烧掉的。

这个解释听起来完全合理，而它是错的。直接测一下就知道：

```javascript
ObjC.import('Foundation');
var c = $.NSDateComponents.alloc.init;
c.year = 2026; c.month = 4; c.day = 5; c.hour = 10;
var cal = $.NSCalendar.alloc.initWithCalendarIdentifier($.NSCalendarIdentifierGregorian);
var t0 = $.NSDate.date;
var r = cal.nextDateAfterDateMatchingComponentsOptions($.NSDate.date, c, $.NSCalendarMatchStrictly);
console.log((r.js ? r.js : "(nil)") + "  elapsed=" + $.NSDate.date.timeIntervalSinceDate(t0));
```

用 `osascript -l JavaScript` 跑，过期年份那条在 0.001 秒内返回 nil。Foundation 处理得很干净，没有任何枚举爆炸。顺带测了农历那几条（除夕是农历十二月三十，而腊月为小月的年份根本没有三十），最慢的一条也只要 0.004 秒，并且正确跳到了下一个存在三十的年份。

所以没有任何一次计算是慢的，96% 的 CPU 来自**反复重算**。合理的推断是：`usernoted` 为一条重复触发器拿到 nil，既无法安排下次又不能把它当作已完成，于是立刻重新排期，再次得到 nil。单次计算越快，空转的频率反而越高。

这个推断没有被直接证实，我没有去反汇编 `usernoted` 确认循环的位置。被证实的是另外两件事：热点在这个调用上，以及删掉这些记录之后故障消失。

## 清理

先说两条会浪费时间的路。重启没用，因为记录在库里，开机重排就重新踩雷（实测新进程十二秒回到满载）。卸载 App 也没用，macOS 不会主动清理已删除 App 的孤儿通知记录，卸载完 47 条一条不少。

真正的清理只要一行，因为 `app` 表上带着 Apple 自己写的级联触发器：

```sql
CREATE TRIGGER app_deleted AFTER DELETE ON app
BEGIN
    DELETE FROM record WHERE app_id=old.app_id;
    DELETE FROM requests WHERE app_id=old.app_id;
    DELETE FROM delivered WHERE app_id=old.app_id;
    DELETE FROM displayed WHERE app_id=old.app_id;
    DELETE FROM snoozed WHERE app_id=old.app_id;
    DELETE FROM categories WHERE app_id=old.app_id;
END;
```

删掉 `app` 里的那一行，六张关联表自动清空，不需要逐表手术。

改带 WAL 的活库之前要让持有它的进程停下来，而这里有个拦路的地方：`usernoted` 由 launchd 托管，正常做法是 `launchctl bootout`，但在开着 SIP（系统完整性保护）的机器上这条命令会直接失败：

```text
Boot-out failed: 150: Operation not permitted while System Integrity Protection is engaged
```

可行的替代是先用信号冻结进程再改库，改完杀掉，靠服务自身的 KeepAlive 拉起一个干净实例（补记：第二例里发现 `launchctl disable` 并不被 SIP 拦截，这里其实也可以先 disable 再动手，见「同一个模式的第二例」）：

```bash
# 动手前先把 db、db-shm、db-wal 三个文件一起备份
PID=$(pgrep -x usernoted)
kill -STOP "$PID"
sqlite3 "$HOME/Library/Group Containers/group.com.apple.usernoted/db2/db" \
  "DELETE FROM app WHERE app_id=<目标 id>;"
kill -KILL "$PID"
```

新进程起来后 CPU 从 96% 掉到 0.0%，进程状态是休眠而不是运行，`pmset -g assertions` 里那条睡眠断言消失，发一条测试通知能正常弹出。被同一条队列拖住的 `donotdisturbd` 和 `NotificationCenter`（分别占着 15% 和 10%）也一起归零，这反过来印证了队头阻塞的判断。

清理之后 `usernoted` 会为同一个 bundle id 新建一个空的登记行，`app_id` 和原来不同，名下零条记录。它不带任何触发器，可以不管。

## 怎么排查

如果你遇到的是同一类症状，顺序大致是这样：

1. 用 `sample <pid> 3` 抓栈，先确认热点函数和所在队列。队列是不是 serial 决定了故障会不会扩散到其他 App。
2. 栈里出现 `UNCalendarNotificationTrigger` 或 `Calendar.nextDate` 就往通知库里查，用 `mode=ro` 打开，别用 `immutable=1`。
3. 解 `record.data` 时记得是两层 plist，日期分量在内层的 `NSKeyedArchiver` 归档里。
4. 重点看 `repeats` 为 true 且日期分量里带 `year` 的记录，尤其是年份已经过去的。
5. 动手前备份 `db`、`db-shm`、`db-wal` 三个文件，清理时删 `app` 表一行让级联触发器收尾。

给写 App 的人的版本只有一句：需要按年硬编码日期的节日（节气、农历节日、复活节这类），触发器一定要把 repeats 关掉，否则它会在你硬编码的第一个日期过去之后变成一颗定时炸弹，而且炸的是整个系统的通知投递，不只是你自己的 App。

## 同一个模式的第二例

写完上面这些的两天后，同一台机器上换了个守护进程重演了一遍。这次是 `dasd`，稳定 100% CPU，同样重启无效。

`dasd` 是 macOS 的后台任务调度器，系统里所有「等空闲、等插电、等网络好再跑」的任务都由它排期和打分。它自己不干活，所以满载只可能意味着有客户端在刷它。抓十秒实时日志按活动名聚合就能看出来是谁：

```bash
/usr/bin/log stream --predicate 'process == "dasd"' --style compact > /tmp/s.txt &
sleep 10; kill -INT $!
grep -oE '50[0-9]:com\.apple\.[a-zA-Z.]+' /tmp/s.txt | sort | uniq -c | sort -nr | head
```

```text
14660 501:com.apple.appstored.ArcadeResetPO
   66 501:com.apple.sirittsd.neuralCompiling
   66 501:com.apple.intelligenceflow.toolbox.update.fastpass
```

一个任务占掉了全部调度活动的 99.5%，每秒约 1400 次。日志里它的调度窗口长这样：

```text
Submitted <_DASActivity: "501:com.apple.appstored.ArcadeResetPO", Utility, 60s,
  [9/20/26, 12:00:00 AM - 9/20/26, 12:00:00 AM]>
Running ... immediately on submission
STARTED ... PID: 1292
Completed 501:com.apple.appstored.ArcadeResetPO
```

窗口宽度为零，而且排查当天早已过了零点，dasd 据此判定「立即执行」。对 `appstoreagent` 同样抓一段实时流，循环的每一轮都被完整打印出来，一轮约十一毫秒：

```text
Calling launch handler for com.apple.appstored.ArcadeResetPO
[ArcadePayoutReset] Handling activity wakeup
[ArcadePayout]      Payout metrics reset with current payout reset time: 2026-09-20 00:00:00+0800
[ArcadePayoutReset] Completed activity
[ArcadePayoutReset] Reset with reason: Rescheduling
[ArcadePayoutReset] Using new date: 2026-09-20 00:00:00+0800 with reason: Rescheduling
[ArcadePayoutReset] Activity not scheduled; submitting request
```

关键是最后两行的对照。`current payout reset time` 是刚刚触发的那个旧日期，`Using new date` 是重排算出来的新日期，两者是同一个值。这个任务的语义是每天本地午夜重置一次分成计数，重排时该写明天的午夜，它写的是今天的。**Apple 自己的日志把 bug 打印在了明面上**，这一层不需要推断。

顺带否掉一个我自己提出的解释。看到日志里的 `+0800`，很容易怀疑这是算「一天的开始」时时区基准不一致导致的，那样 bug 就只命中特定偏移的地区，也就解释了它为什么没被大规模报道。换算一遍就能推翻：洛杉矶当时是 9 月 19 日 20:40，`startOfDay(now)` 是 9 月 19 日零点 PDT，同样已经过去二十小时。「今天的本地午夜」在任何时区都是过去时刻，所以这个猜测不成立，而它原本要解释的那个疑问，本文也就没有答案。

`~/Library/Preferences/com.apple.appstored.plist` 里存着同一个值，和日志逐秒吻合：

```text
ArcadePayoutResetDate   = 2026-09-19 16:00:00 +0000
ArcadeSubscriptionState = "Paid"
```

这里有第二个值得记下来的错误，而且这次是我犯的。把这个字段改到一个月之后，dasd 立刻从满载掉到 0.13%，十秒日志里该活动出现零次，连带被拖住的 `launchd` 和 `PerfPowerServices` 也一起归零，看上去干净利落。四十六分钟后循环回来了。再测一次才看清：`appstored` 每次重新推算都会把这个字段盖回去，写入后几秒就被覆盖，而当初那次 CPU 归零的真正原因是那段时间 `appstoreagent` 恰好没有被拉起来。**plist 是缓存，不是源头，改它从来没有起过作用。**

这和上一例里「一个被测量推翻的假设」是同一类错误，区别在于证伪的方式。上一例是主动去测一个听起来合理的解释，当场就翻了；这一例是只观察了一次就下结论，靠时间才翻。一个「改完就好了」和一个「恰好安静了一会儿」，在事发当时长得一模一样，唯一能分开它们的是等一等再测第二次。

两个案例的差别在载体和失败形式。usernoted 把坏数据存在 SQLite 库里，算出来的「下一次」是 nil；appstored 每次都现算出一个已经过去的时刻，磁盘上那份只是缓存。**相同的是那个自相矛盾的组合：一个不会再发生的时间点，配上「求下一次」的语义。**单次计算都极快，所以空转频率都极高。

两者也都扛得住重启，但原因不同，而这个区别恰好决定了能不能动手。usernoted 是坏记录躺在磁盘上，删掉就没了；appstored 是每次启动都重新算出同一个坏值，磁盘上改什么都会被盖掉。

登出 App Store 账号是我试的第二个办法，也失败了。`ArcadeSubscriptionState` 确实从 `Paid` 变成了 `Unsubscribed`，`ArcadePayoutIntervalStartDate` 这些字段也都刷新到了当前时刻，唯独 `ArcadePayoutResetDate` 纹丝不动，循环照旧，二十秒烧二十点九五秒。订阅状态不是这个任务的闸门。

真正管用的办法来自一个被我误判了两次的边界。SIP 在这里看起来同样挡路，`launchctl kickstart` 和 `launchctl bootout` 对 `com.apple.appstoreagent` 都返回那个熟悉的 150，很容易读成「这个 agent 停不下来」。但 `launchctl disable` 不在被挡的范围里：

```bash
launchctl disable gui/$(id -u)/com.apple.appstoreagent   # exit 0
killall appstoreagent                                     # 这之后 launchd 不再拉起它
launchctl enable gui/$(id -u)/com.apple.appstoreagent    # 恢复
```

**SIP 拦的是启停 Apple 系统服务的运行实例，不拦把服务标记为禁用。**先 disable 再 killall，合起来就得到了 bootout 被拒绝的那个效果，而且禁用状态写在 launchd 的 override 数据库里，跨重启保留。

这解释了此前所有零碎的观察。`appstoreagent` 会空闲退出，它一走循环就停，但 dasd 那边的活动登记还在，过一阵按需把它拉起来，循环重启，于是这台机器的 dasd 呈现出「平均只占 37% CPU」这种断续的形态，也于是有了那 46 分钟的假阳性。断掉按需拉起，链条才真正断开。

所以上一节给开发者的那句忠告，**Apple 自己在 appstored 里也没做到**。这类 bug 不是第三方 App 不够仔细的产物，它只是「日期算术 + 重复语义」这个组合本身就容易写错。

## 本文没有覆盖的

空转循环的确切位置没有被证实。我只证明了热点在 `nextTriggerDateAfterDate:` 这条调用上，以及删除记录后故障消失，中间「拿到 nil 后立刻重排」这一步是推断，没有反汇编验证。

结论也只在一台机器、一个系统版本上验证过，没有在其他 macOS 版本上复现。`db2/db` 的表结构是 Apple 的内部实现，随版本变动，文中的 SQL 在旧版或将来的版本上不保证适用。

直接修改系统数据库不是 Apple 支持的操作。如果这个 App 还留在机器上，在系统设置里关掉它的通知权限是更保守的做法，代价是该 App 从此不再发通知。

dasd 那例的取证结构和第一例正好相反。循环本身是直接观察到的，`appstoreagent` 的日志逐行打印了每一轮，这一层比第一例还硬；没查清的是上游，也就是 `appstored` 为什么把重排日期算成 `startOfDay(now)`。我没有抓栈也没有反汇编，触发条件里除了「有活跃的 Arcade 订阅」之外还有什么同样不知道。这个缺口不小：如果条件真的只有订阅这一条，那么每一台订阅了 Arcade 的 Mac 都应该在烧一个核，而这显然不符合现实，所以一定还有我没找到的前提。

这一例只有绕法，没有修复。截至 2026 年 9 月 20 日，macOS 27.0（26A428）是最新版本，`softwareupdate -l` 报告无可用更新，`appstored` 的排期逻辑依旧是坏的。禁用 `appstoreagent` 只是切断了执行链，代价是 App Store 的下载和更新一并停掉，属于拿功能换 CPU，不适合当成通用建议。

禁用状态跨重启保留这一点是按 `launchctl` 的设计推断的，本文没有实测。验证方法是重启后跑 `launchctl print-disabled gui/$(id -u) | grep appstore`。

两例之间的「同一个模式」是我的归纳，不是从任何一方的实现里读出来的。它们共享的是可观察的症状，底层代码是否真的以相似的方式出错，本文没有证据。

## 参考

以下内容均为本机实测，验证日期 2026 年 9 月 18 日，系统为 Darwin 27.0.0：

- 守护进程 `/usr/sbin/usernoted`，由 `com.apple.usernoted` 这个 LaunchAgent 托管，开启了 KeepAlive。
- 通知库 `~/Library/Group Containers/group.com.apple.usernoted/db2/db`，SQLite + WAL，`app_deleted` 级联触发器的定义来自 `.schema app` 的输出。
- SIP 下 `launchctl bootout` 返回错误码 150。
- 涉及的 API：`UNCalendarNotificationTrigger`（UserNotifications 框架）、`Calendar.nextDate(after:matching:)`（Foundation）。

第二例为本机实测，验证日期 2026 年 9 月 20 日，系统 Darwin 27.0.0 / 构建号 26A428：

- 守护进程 `/usr/libexec/dasd`（Duet Activity Scheduler），由 launchd 以 root 身份托管，服务名 `com.apple.dasd`。
- 客户端 `appstoreagent`（AppStoreDaemon.framework），状态文件 `~/Library/Preferences/com.apple.appstored.plist`。
- SIP 下 `launchctl kickstart -k` 和 `launchctl bootout` 对 `gui/<uid>/com.apple.appstoreagent` 均返回 150，但 `launchctl disable` 返回 0，禁用后 `launchctl print-disabled gui/<uid>` 可见该服务标记为 `disabled`。
- 禁用并 killall 之后的实测：dasd 二十秒消耗 0.04 秒 CPU，六分钟后复测为 0.00 秒，十二秒日志从 50862 行降到 222 行，`ArcadeResetPO` 出现零次。
- 判断进程是否真的恢复要用 `ps -p <pid> -o time=` 前后差分。`ps` 的 `%CPU` 是衰减平均值，在已运行一天以上的进程上滞后严重，空转停止后它仍会显示接近满载。
- `log show --predicate ... --last <窗口>` 在这台机器上给出过前后不一致的计数（`--last 30s` 与 `--last 1m` 相隔数分钟查询，逐项统计几乎完全相同），且单次耗时超过 60 秒，所以正文用的是短时 `log stream` 落盘再聚合。
