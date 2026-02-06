# PattaMap Monitoring Guide

This guide covers how to set up and configure monitoring for the PattaMap application in production.

---

## 1. Sentry Error Monitoring

Sentry is configured for both frontend (`src/config/sentry.ts`) and backend (`backend/src/config/sentry.ts`).

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SENTRY_DSN` | Frontend (.env) | Sentry DSN for the React app |
| `VITE_SENTRY_ENVIRONMENT` | Frontend (.env) | `production` or `staging` |
| `VITE_SENTRY_ENABLE_TRACING` | Frontend (.env) | `true` to enable performance tracing |
| `SENTRY_DSN` | Backend (.env) | Sentry DSN for the Express API |
| `NODE_ENV` | Backend (.env) | `production` for prod error reporting |

### Recommended Alert Rules (Sentry Dashboard)

Configure these in **Sentry > Alerts > Create Alert Rule**:

1. **Error Spike Alert**
   - Condition: Number of events > 50 in 1 hour
   - Action: Email + Slack notification
   - Priority: High

2. **New Issue Alert**
   - Condition: A new issue is created (first seen)
   - Filter: `level:error` (ignore warnings)
   - Action: Email notification
   - Priority: Medium

3. **Performance Degradation**
   - Condition: Transaction duration p95 > 3s for 5 minutes
   - Filter: Transaction name contains `/api/`
   - Action: Email notification
   - Priority: Medium

4. **Unhandled Rejection Spike**
   - Condition: Events matching `UnhandledRejection` > 10 in 30 min
   - Action: Email + Slack notification
   - Priority: High

---

## 2. Uptime Monitoring (UptimeRobot)

Set up monitors at [UptimeRobot](https://uptimerobot.com):

### Health Endpoint Monitor
- **Type**: HTTP(s)
- **URL**: `https://your-api-domain.com/api/health`
- **Interval**: 5 minutes
- **Expected status**: 200
- **Alert contacts**: Email, Slack
- **Expected keyword**: `PattaMap API is running`

### Frontend Monitor
- **Type**: HTTP(s)
- **URL**: `https://pattamap.com`
- **Interval**: 5 minutes
- **Expected status**: 200

### Recommended Alert Thresholds
- Alert after **2 consecutive failures** (avoid false alarms from transient issues)
- Alert on **SSL certificate expiration** (30 days before)

---

## 3. Core Web Vitals (Frontend Performance)

The frontend reports Web Vitals via `web-vitals` library. Track these metrics in your analytics dashboard or Sentry Performance:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4s | > 4s |
| **FID** (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **TTFB** (Time to First Byte) | < 800ms | 800ms - 1.8s | > 1.8s |
| **INP** (Interaction to Next Paint) | < 200ms | 200ms - 500ms | > 500ms |

### Where to Monitor
- **Sentry Performance**: Automatic if `VITE_SENTRY_ENABLE_TRACING=true`
- **Google Search Console**: Core Web Vitals report (field data)
- **PageSpeed Insights**: On-demand lab testing

---

## 4. Environment Variables Checklist

Before going live, verify all monitoring-related env vars are set:

### Frontend (.env.production)
```
VITE_SENTRY_DSN=https://xxx@sentry.io/yyy
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_ENABLE_TRACING=true
VITE_VERSION=1.0.0
```

### Backend (.env)
```
SENTRY_DSN=https://xxx@sentry.io/zzz
NODE_ENV=production
```

---

## 5. Runbook: Common Alerts

### Error Spike
1. Check Sentry for the most frequent error
2. Check if it correlates with a recent deployment
3. Check API health: `curl https://your-api-domain.com/api/health`
4. Check backend logs for database connection issues

### Health Check Down
1. Check if the server process is running
2. Check database connectivity (Supabase dashboard)
3. Check Redis connectivity (if rate limiting fails)
4. Review recent deployments for breaking changes

### Performance Degradation
1. Check Sentry Performance for slow transactions
2. Check database query times in Supabase dashboard
3. Verify CDN cache hit rates
4. Check for N+1 queries or missing indexes
