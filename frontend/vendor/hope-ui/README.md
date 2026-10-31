# Locally packaged Hope UI

Hope UI design system 1.0.3, MIT license (included).
Upstream: https://github.com/iqonicdesignofficial/hope-ui-design-system
Pinned commit: 3a51f05d110595d8fce5f975574668a1a462abdb.

Files: dist/assets/css/hope-ui.min.css, dist/assets/images/loader.gif, LICENSE.
The remote Google Fonts @import and source-map reference are removed from CSS;
the application uses its existing system-font fallback. No CDN dependency.
Bootstrap 5.3.3 remains the base CSS/JS; Hope UI supplies the theme, followed by
the existing application overrides. No Hope UI JavaScript or extra plugins are
needed for the application's Bootstrap-driven forms, dialogs and navigation.
