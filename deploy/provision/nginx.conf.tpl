# Config is autogenerated – do not change it manually
map $http_referer $referer_site_type {
    ~https?://metrika\.yandex\.ru/.* "metrika";
    ~https?://webvisor\.com/.* "metrika";
    default "other";
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    access_log /dev/stderr;
    error_log /dev/stderr info;

    gzip on;
    gzip_min_length 1460;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/html text/css text/xml text/plain application/javascript;
    gzip_disable "msie6";

    root /usr/share/nginx/html;
    index index.html;

    location ~ \.(jpe?g|png|webp|svg|css|js|ico) {
        if ($arg_v) {
            add_header Cache-Control "public, max-age=315360000, no-transform";
        }
    }

    location /robots.txt {
        add_header Cache-Control "public, no-cache, no-transform";
    }

    location /sitemap.xml {
        add_header Cache-Control "public, no-cache, no-transform";
    }

    location / {
        add_header Cache-Control "public, max-age=3600, must-revalidate, no-transform";
        if ($referer_site_type = "other") {
            add_header Cache-Control "public, max-age=3600, must-revalidate, no-transform";
            add_header X-Content-Type-Options "nosniff";
            add_header X-XSS-Protection "1; mode=block";
            add_header X-Frame-Options "deny";
        }
    }
}