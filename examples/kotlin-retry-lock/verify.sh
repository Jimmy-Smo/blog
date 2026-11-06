#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p target
mvn -B dependency:build-classpath -Dmdep.outputFile=target/classpath.txt "$@"
classpath=$(cat target/classpath.txt)
kotlinc -jvm-target 21 -cp "$classpath" RetryWithLock.kt RetryWithLockCheck.kt \
  -include-runtime -d target/retry-check.jar
java -cp "target/retry-check.jar:$classpath" blog.RetryWithLockCheckKt
