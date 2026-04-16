# Node 2 Production LXC — Customer-Facing Services

## Status: STAGED (not yet needed)

CT 100 on Node 1 currently handles all reverse proxy + static hosting + cloudflared tunnel.
This plan stages a dedicated LXC on Node 2 for when we need to separate customer-facing
services from internal ops infrastructure.

## When to Pull the Trigger

Move to Node 2 LXC when ANY of these are true:
- CT 100 resource contention (CPU/memory) from too many backends
- Need process isolation between customer-facing and internal services
- Want independent deploy cycles (ship nodaves without risking ops.darrenarney.com)
- Node 2 storage expansion (Wave 2 SSDs) is complete

## Current Architecture (CT 100 — what works today)

```
Internet → Cloudflare → cloudflared tunnel (CT 100)
                              ↓
                    nginx (CT 100, 192.168.0.250)
                    ├── nodaves.com → /var/www/nodaves/ (static) + :8907 (API)
                    ├── dampionship.com → /var/www/dwave/ (static)
                    ├── ops.darrenarney.com → /var/www/darntech-ops/ (static) + proxies
                    └── ... (28+ other domains)
```

## Target Architecture (Node 2 LXC)

```
Internet → Cloudflare → cloudflared tunnel (Node 2 CT 300)
                              ↓
                    nginx (CT 300, 192.168.0.xxx)
                    ├── nodaves.com → static + FastAPI (:8907)
                    ├── dampionship.com → static
                    └── [future customer-facing sites]

Internal → direct port forward → nginx (CT 100, 192.168.0.250)
                    ├── ops.darrenarney.com (Authelia-protected)
                    ├── *.darrenarney.com internal services
                    └── Let's Encrypt certs (direct domains)
```

## CT 300 Spec (Proposed)

| Setting | Value | Rationale |
|---------|-------|-----------|
| ID | 300 | Next clean ID on Node 2 |
| OS | Debian 12 (bookworm) | Match CT 100 |
| Cores | 2 | Customer sites are lightweight |
| RAM | 2GB | nginx + 2-3 FastAPI apps |
| Disk | 10GB | Static sites + SQLite DBs |
| Network | vmbr0, static IP 192.168.0.201 | LAN accessible |
| Tailscale | Yes | Remote management |

## Bootstrap Steps

```bash
# 1. Create CT on Node 2 Proxmox
pct create 300 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname nodaves-prod \
  --cores 2 --memory 2048 --swap 512 \
  --rootfs local-lvm:10 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.0.201/24,gw=192.168.0.1 \
  --features nesting=1 \
  --start 1

# 2. Base packages
pct exec 300 -- bash -c '
  apt update && apt install -y \
    nginx certbot python3 python3-pip python3-venv \
    curl git
'

# 3. Install cloudflared
pct exec 300 -- bash -c '
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | \
    tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
    https://pkg.cloudflare.com/cloudflared bookworm main" | \
    tee /etc/apt/sources.list.d/cloudflared.list
  apt update && apt install -y cloudflared
'

# 4. Create tunnel (or migrate existing tunnel credentials)
# Option A: Move tunnel from CT 100
#   - Copy /root/.cloudflared/*.json to CT 300
#   - Copy /etc/cloudflared/config.yml
#   - Stop cloudflared on CT 100
#   - Start on CT 300
#
# Option B: New tunnel for customer-facing only
#   - cloudflared tunnel login
#   - cloudflared tunnel create customer-prod
#   - Route customer domains to new tunnel

# 5. Deploy app(s)
# For each customer-facing app:
#   - mkdir /opt/{app-name}
#   - scp backend code
#   - pip install in venv
#   - seed DB
#   - systemd service
#   - nginx server block
#   - cloudflared ingress entry
```

## Migration Checklist (when ready)

- [ ] Create CT 300 on Node 2
- [ ] Install base packages + cloudflared
- [ ] Decide: move existing tunnel or create new one
- [ ] Copy nodaves backend + static files
- [ ] Copy dampionship static files
- [ ] Create nginx configs for both
- [ ] Configure cloudflared ingress
- [ ] Update Cloudflare DNS CNAMEs if new tunnel
- [ ] Verify both sites work through new tunnel
- [ ] Remove customer-facing entries from CT 100 nginx + cloudflared
- [ ] Update darntech MEMORY.md + CLAUDE.md with new topology
- [ ] Update casey-junior pipeline registration with new endpoints

## What Stays on CT 100

- All `*.darrenarney.com` domains (ops, vault, n8n, etc.)
- Authelia authentication
- Let's Encrypt cert management
- Internal service proxies (Lorna, Casey, Command Server)
- Direct port forwarding (no tunnel needed for these)

## Cost of NOT Doing This

Low. CT 100 handles the current load fine. The tunnel adds <15ms latency
regardless of which node it runs on. The main benefit of splitting is
operational independence — shipping a nodaves update shouldn't require
thinking about whether it'll affect ops.darrenarney.com.
