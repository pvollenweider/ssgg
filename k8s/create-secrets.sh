#!/bin/bash
# Crée les secrets Kubernetes pour gallerypack
# Usage: remplir les variables ci-dessous puis: bash k8s/create-secrets.sh

set -e

# ── À remplir ────────────────────────────────────────────────────────────────
DB_PASS=""                   # openssl rand -hex 32
DB_ROOT_PASSWORD=""          # openssl rand -hex 32
SESSION_SECRET=""            # openssl rand -hex 32
VIEWER_TOKEN_SECRET=""       # openssl rand -hex 32
ADMIN_EMAIL=""               # ex: admin@example.com
ADMIN_PASSWORD=""            # mot de passe admin initial
GITHUB_USERNAME=""           # ton username GitHub (pour ghcr.io)
GITHUB_TOKEN=""              # GitHub PAT avec scope read:packages
GANDI_API_KEY=""             # Gandi LiveDNS API key (Gandi → Sécurité → Clés d'API)
# ─────────────────────────────────────────────────────────────────────────────

if [[ -z "$DB_PASS" || -z "$SESSION_SECRET" || -z "$ADMIN_EMAIL" || -z "$GITHUB_USERNAME" ]]; then
  echo "Erreur : remplis toutes les variables dans le script avant de lancer."
  exit 1
fi

echo "Création du secret gallerypack-secrets..."
kubectl create secret generic gallerypack-secrets \
  --namespace gallerypack \
  --from-literal=DB_PASS="$DB_PASS" \
  --from-literal=DB_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
  --from-literal=SESSION_SECRET="$SESSION_SECRET" \
  --from-literal=VIEWER_TOKEN_SECRET="$VIEWER_TOKEN_SECRET" \
  --from-literal=ADMIN_EMAIL="$ADMIN_EMAIL" \
  --from-literal=ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Création du secret ghcr-secret..."
kubectl create secret docker-registry ghcr-secret \
  --namespace gallerypack \
  --docker-server=ghcr.io \
  --docker-username="$GITHUB_USERNAME" \
  --docker-password="$GITHUB_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

if [[ -n "$GANDI_API_KEY" ]]; then
  echo "Création du secret gandi-api-key (cert-manager)..."
  kubectl create secret generic gandi-api-key \
    --namespace cert-manager \
    --from-literal=api-token="$GANDI_API_KEY" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

echo "Secrets créés."
echo ""
echo "Pour générer des secrets aléatoires :"
echo "  openssl rand -hex 32"
