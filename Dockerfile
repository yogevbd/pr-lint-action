FROM node:10-slim

LABEL com.github.actions.name="PR Linter"
LABEL com.github.actions.description="Lint PR before merging"
LABEL com.github.actions.icon="code"
LABEL com.github.actions.color="blue"
LABEL com.github.actions.repository="https://github.com/yogevbd/pr-lint-action"
LABEL com.github.actions.homepage="https://github.com/yogevbd/pr-lint-action"

LABEL maintainer="Yogev Ben David <yogev132@gmail.com>"

COPY lib /action/lib
ENTRYPOINT ["/action/lib/entrypoint.sh"]
