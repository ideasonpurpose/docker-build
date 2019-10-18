#!/bin/bash

# Checks to see if the first argument is a known script in package.json, and if
# found, passes all args to `npm run`. Otherwise, args are executed directly.
#
# The `jq` JSON parsing tool is installed by the Dockerfile. https://stedolan.github.io/jq/

NPM_SCRIPTS=( $(jq -r '.scripts | keys | .[]' package.json) )

for SCRIPT in "${NPM_SCRIPTS[@]}"
do
  if [ "$SCRIPT" == "$1" ] ; then
    exec npm run $@
  fi
done

# If attempting `npm clean-install` without a package-lock.json`
# run `npm install` instead
if [[ "$@" == 'npm clean-install' && ! -f /usr/src/site/package-lock.json ]]; then
  exec npm install
fi

exec "$@"
