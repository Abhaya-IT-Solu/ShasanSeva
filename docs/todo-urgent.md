# Urgent Todo List

## Infrastructure
1. **Apply Nginx Bot-Blocking Config** — Safe to apply AFTER SSL is stable.
   - Apply `docs/nginx-shasansetu-api.conf` to EC2
   - Then run `sudo certbot --nginx -d api.shasanseva.in` to re-add SSL
   - Then `sudo nginx -t && sudo systemctl reload nginx`

## Pending SQL (run on production Supabase)
```sql
ALTER TABLE orders ADD COLUMN receipt_key VARCHAR(500);
```