FROM node:22-bookworm

RUN apt-get update && apt-get install -y git curl jq unzip python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ARG AGENT_UID=1000
ARG AGENT_GID=1000
RUN groupmod -o -g $AGENT_GID node && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node

RUN npm install -g @openai/codex

USER ${AGENT_UID}:${AGENT_GID}

ARG BUN_VERSION=1.3.11
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
ENV PATH="/home/agent/.bun/bin:$PATH"

COPY --chown=${AGENT_UID}:${AGENT_GID} codex-config.toml /home/agent/.codex/config.toml

WORKDIR /home/agent
ENTRYPOINT ["sleep", "infinity"]
