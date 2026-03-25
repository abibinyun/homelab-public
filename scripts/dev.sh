#!/bin/bash

# Dev Services Manager
# Manage development services dengan profile

case $1 in
  start)
    echo "🚀 Starting dev services..."
    docker compose --profile dev up -d
    echo "✅ Dev services started"
    docker compose --profile dev ps
    ;;
  stop)
    echo "🛑 Stopping dev services..."
    docker compose --profile dev stop
    echo "✅ Dev services stopped"
    ;;
  restart)
    echo "🔄 Restarting dev services..."
    docker compose --profile dev restart
    echo "✅ Dev services restarted"
    ;;
  logs)
    docker compose --profile dev logs -f
    ;;
  ps)
    echo "📋 Dev services status:"
    docker compose --profile dev ps
    ;;
  *)
    echo "Dev Services Manager"
    echo ""
    echo "Usage: ./dev.sh {start|stop|restart|logs|ps}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all dev services"
    echo "  stop    - Stop all dev services"
    echo "  restart - Restart all dev services"
    echo "  logs    - View dev services logs"
    echo "  ps      - List dev services status"
    ;;
esac
