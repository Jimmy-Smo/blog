package blog

private inline fun <reified T : Throwable> expectFailure(block: () -> Unit) {
    try {
        block()
        error("expected ${T::class.java.name}")
    } catch (failure: Throwable) {
        check(failure is T) { "expected ${T::class.java.name}, got $failure" }
    }
}

fun main() {
    // 旧分支返回 false 后正常结束，不会自动重试。
    var oldAttempts = 0
    lockRetry().execute<Unit, Exception> {
        oldAttempts++
        if (false) error("unreachable business action")
    }
    check(oldAttempts == 1)

    var attempts = 0
    var releases = 0
    var actions = 0
    val value = retryWithLock(lockRetry(), { ++attempts == 3 }, { releases++ }) {
        actions++
        "done"
    }
    check(value == "done" && attempts == 3 && releases == 1 && actions == 1)

    attempts = 0
    releases = 0
    expectFailure<LockBusyException> {
        retryWithLock(lockRetry(), { attempts++; false }, { releases++ }) {
            error("business must not run without the lock")
        }
    }
    check(attempts == 3 && releases == 0)

    attempts = 0
    releases = 0
    val businessFailure = IllegalArgumentException("bad request")
    try {
        retryWithLock(lockRetry(), { attempts++; true }, { releases++ }) {
            throw businessFailure
        }
        error("business failure must propagate")
    } catch (failure: IllegalArgumentException) {
        check(failure === businessFailure)
    }
    check(attempts == 1 && releases == 1)

    attempts = 0
    releases = 0
    expectFailure<InterruptedException> {
        retryWithLock(lockRetry(), { attempts++; throw InterruptedException() }, { releases++ }) {
            error("business must not run after interruption")
        }
    }
    check(attempts == 1 && releases == 0 && Thread.currentThread().isInterrupted)
    Thread.interrupted() // 清理本检查设置的线程标记。
    println("PASS: normal-return, retry-success, exhausted, business-failure, interruption")
}
