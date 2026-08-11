#!/bin/sh
# Stands in for an engine that crashes rather than exiting, so the process is
# killed by a signal and has no exit code to report.
echo "crashingEngine: simulated crash" >&2
kill -SEGV $$
