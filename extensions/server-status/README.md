# Service monitoring

Select a service in the widget settings, then enable **Monitoring**.
DashDock checks it approximately once per minute on the server, even with the browser closed.
The bounded history is kept for 24 hours in the Docker data volume, across restarts.
Monitoring is shared by widgets pointing to the same service. Disabling it stops collection and keeps recent history.

The chart offers 1 h, 6 h and 24 h ranges. Its accent line shows successful HTTP response latency in milliseconds; red marks indicate failed checks. Gaps remain empty when no measurement was collected. The success percentage is the proportion of observed checks, not an estimate of continuous uptime.

Requires a DashDock version with the `status.history` and `status.tracking` bridge methods.

## Français

Choisissez un service dans les réglages, puis activez **Activer le suivi**.
Le serveur effectue un relevé environ chaque minute, même lorsque le navigateur est fermé.
L’historique est conservé pendant 24 heures dans le volume Docker et survit aux redémarrages.
Les widgets du même service partagent le suivi. Sa désactivation arrête la collecte et conserve les mesures récentes.

Le graphique propose les périodes 1 h, 6 h et 24 h. La courbe indique la latence HTTP en millisecondes et les repères rouges les échecs. Les périodes sans relevé restent vides. Le pourcentage correspond aux relevés réussis, pas à une estimation de disponibilité continue.
