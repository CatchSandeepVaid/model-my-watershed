#!/bin/bash

# run the whole suite of app tests (for use in development or CI)

set -e
set -x

# Run flake8 against the Django codebase and output a known string so that
# the Jenkins text finder plugin can detect a failed check and mark the build
# unstable. This command should only fail the build if the `vagrant ssh`
# command itself fails.
vagrant ssh app -c "flake8 /opt/app/apps --exclude migrations || echo flake8 check failed"

# Run the Django test suite with --noinput flag.
vagrant ssh app -c "cd /opt/app && envdir /etc/mmw.d/env ./manage.py test --noinput --exclude-tag=mapshed"

# Check for client-side JS lint.
# vagrant ssh app -c "cd /opt/app && npm run lint"

# Run JS unit tests, unless flag set to skip them.
# vagrant ssh app -c "cd /var/www/mmw/static &&
#    xvfb-run /opt/app/node_modules/.bin/testem -f /opt/app/testem.json ci"

if [[ -z "${MMW_SKIP_JS_TESTS}" ]]; then
    vagrant ssh app -c "cd /var/www/mmw/static &&
        xvfb-run /opt/app/node_modules/.bin/testem -f /opt/app/testem.json ci $*"
else
    echo "SKIPPING JS TESTS"
fi
