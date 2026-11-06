package blog

import org.springframework.retry.support.RetryTemplate

class LockBusyException : RuntimeException("lock busy")

fun lockRetry(): RetryTemplate = RetryTemplate.builder()
    .maxAttempts(3)
    .fixedBackoff(10)
    .retryOn(LockBusyException::class.java)
    .build()

fun <T> retryWithLock(
    retry: RetryTemplate,
    tryAcquire: () -> Boolean,
    release: () -> Unit,
    action: () -> T
): T = retry.execute<T, Exception> {
    val acquired = try {
        tryAcquire()
    } catch (e: InterruptedException) {
        Thread.currentThread().interrupt()
        throw e
    }
    if (!acquired) throw LockBusyException()
    try {
        action()
    } finally {
        release()
    }
}
