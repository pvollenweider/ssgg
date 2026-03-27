FROM httpd:2.4

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    gettext-base \
  && rm -rf /var/lib/apt/lists/*

# Enable required modules
RUN sed -i \
    -e 's/^#\(LoadModule proxy_module\)/\1/' \
    -e 's/^#\(LoadModule proxy_http_module\)/\1/' \
    -e 's/^#\(LoadModule proxy_wstunnel_module\)/\1/' \
    -e 's/^#\(LoadModule rewrite_module\)/\1/' \
    -e 's/^#\(LoadModule ssl_module\)/\1/' \
    -e 's/^#\(LoadModule headers_module\)/\1/' \
    -e 's/^#\(LoadModule deflate_module\)/\1/' \
    -e 's/^#\(LoadModule expires_module\)/\1/' \
    -e 's/^#\(LoadModule socache_shmcb_module\)/\1/' \
    -e 's/^#\(LoadModule substitute_module\)/\1/' \
    /usr/local/apache2/conf/httpd.conf

# Include extra configs from conf.d/
RUN echo 'IncludeOptional /usr/local/apache2/conf/conf.d/*.conf' \
    >> /usr/local/apache2/conf/httpd.conf

RUN mkdir -p /usr/local/apache2/conf/conf.d

COPY vhost.conf.template /etc/apache2/vhost.conf.template
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Galleries static files are served from this volume
RUN mkdir -p /srv/galleries

# ACME webroot challenge directory
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

ENTRYPOINT ["docker-entrypoint.sh"]
