1.  Just run the receipt_key SQL on prod (safest)
    Since you already ran it on dev, just run the same SQL on your production Supabase:
    ```
    sql
    ALTER TABLE orders ADD COLUMN receipt_key VARCHAR(500);
    ```