# Web Vitals Collection & Dashboard

This project records Core Web Vitals in Supabase so the product and platform teams can monitor performance trends across critical tenant journeys.

## How the pipeline works

1. The Next.js runtime exports `reportWebVitals` from `app/layout.tsx`.
2. Browser metrics are normalised in `utils/metrics/web-vitals.ts` and sent to `/api/vitals`.
3. The API route validates each payload with Zod and persists the record in the `web_vitals` table using the Supabase service role key.

Each record captures the metric id, score, rating, navigation context, and route metadata (path segments, search parameters, connection information, etc.).

## Viewing the Supabase dashboard

1. Sign in to [Supabase Studio](https://app.supabase.com) using the credentials for this project.
2. Select the **Share House Portal** project, then open **Data → Tables** and choose `web_vitals` to inspect raw events.
3. Navigate to **Data → Saved queries** and create a new query named `web_vitals_dashboard` with the SQL below:

   ```sql
   select
     route,
     name as metric,
     rating,
     percentile_cont(0.75) within group (order by value) as p75_value,
     avg(value) as average_value,
     count(*) as samples,
     max(recorded_at) as last_recorded_at
   from web_vitals
   group by route, metric, rating
   order by route, metric;
   ```

4. Save the query, then click **Visualize** to open the Supabase charts builder.
5. Configure a bar or line chart using:
   - **X axis:** `route`
   - **Series:** `metric`
   - **Values:** `p75_value`
   - **Filter (optional):** `rating = 'poor'` to focus on regressions
6. Pin the chart to a dashboard named `Web Vitals` so it is easy to access from **Reports → Dashboards**.
7. Share the dashboard URL with stakeholders or subscribe to weekly email summaries directly in Supabase.

## Troubleshooting tips

- Ensure `SUPABASE_SERVICE_ROLE_KEY` is configured in the deployment environment; without it the API route will return a 500 error.
- If no data appears, confirm that the Lighthouse CI workflow ran successfully and the client bundles were built in production mode so `reportWebVitals` executes.
- Use Supabase's row-level security (RLS) policies to restrict access if you extend the dashboard to multi-tenant views.
