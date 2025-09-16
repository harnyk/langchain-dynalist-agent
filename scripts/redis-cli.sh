#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v ^# | xargs)
fi

# Parse Redis URL
if [ -z "$REDIS_URL" ]; then
    echo "Error: REDIS_URL not found in .env.local"
    exit 1
fi

# Extract components from redis://username:password@host:port format
REDIS_CONNECTION=$(echo $REDIS_URL | sed 's/redis:\/\///')
USERPASS=$(echo $REDIS_CONNECTION | cut -d'@' -f1)
HOSTPORT=$(echo $REDIS_CONNECTION | cut -d'@' -f2)

USERNAME=$(echo $USERPASS | cut -d':' -f1)
PASSWORD=$(echo $USERPASS | cut -d':' -f2)
HOST=$(echo $HOSTPORT | cut -d':' -f1)
PORT=$(echo $HOSTPORT | cut -d':' -f2)

echo "Connecting to Redis at $HOST:$PORT as $USERNAME..."

# Connect to Redis CLI with credentials
redis-cli -h $HOST -p $PORT -a $PASSWORD --user $USERNAME