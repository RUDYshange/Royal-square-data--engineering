# Running this on Windows

Two options. Take the first one.

## Option A — WSL2 (recommended)

Everything in the repo works unchanged, because you are running Linux.

```powershell
wsl --install -d Ubuntu     # then reboot
```

Install Docker Desktop, then **Settings → Resources → WSL Integration** and
enable it for your Ubuntu distro. Now open Ubuntu and work there:

```bash
cd ~                        # keep the repo in the Linux filesystem, not /mnt/c
git clone <your-repo> royal-pipeline && cd royal-pipeline
cp .env.example .env
make up
make smoke
```

**Keep the repo inside the WSL filesystem** (`~/royal-pipeline`), not under
`/mnt/c/Users/...`. Cross-filesystem I/O in WSL2 is roughly ten times slower,
and Spark reading Parquet through that boundary is painful enough that you will
blame Spark for it.

## Option B — PowerShell only

Use the included PowerShell equivalents:

```powershell
.\make.ps1 up            # instead of: make up
.\make.ps1 smoke
.\make.ps1 seed-stream
.\make.ps1 batch
.\make.ps1 dbt
.\make.ps1 down
```

If scripts are blocked:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Docker Desktop still uses WSL2 underneath either way — this only changes where
you type commands.

---

## Memory: the thing that will actually bite you

This stack runs Spark master, a Spark worker, Airflow, Postgres, Redpanda,
Kafka Connect, MinIO, Redis, and two Python services. That is roughly **10–12 GB
of RAM**. Docker Desktop on Windows defaults to about half your system memory,
and when it runs out, containers are killed silently — you get a dead Spark
worker and no obvious error.

Create `C:\Users\<you>\.wslconfig`:

```ini
[wsl2]
memory=12GB
processors=4
swap=4GB
```

Then `wsl --shutdown` in PowerShell and restart Docker Desktop.

**If you have 16 GB or less**, run the stack in halves instead. Comment out
`spark-master`, `spark-worker` and `airflow` while working on the streaming
side; comment out `connect`, `stream-consumer` and `console` while working on
batch. You lose nothing conceptually — you are studying one path at a time
anyway, which is how the schedule is structured.

Check what you have:

```powershell
Get-CimInstance Win32_ComputerSystem | Select-Object -ExpandProperty TotalPhysicalMemory
```

---

## Line endings

Already handled by `.gitattributes`, but if you cloned before adding it and see:

```
/usr/bin/env: 'bash\r': No such file or directory
```

that is CRLF inside a Linux container. Fix it:

```powershell
git config --global core.autocrlf input
git rm --cached -r .
git reset --hard
```

---

## Port conflicts

Windows tends to occupy some of these already. Check before starting:

```powershell
netstat -ano | Select-String ":5432|:8080|:8081|:9000|:9092|:8000"
```

Common collisions: **5432** if you have Postgres installed natively, **8080**
from IIS or another dev server. Change the host side of the mapping in
`docker-compose.yml` — `"5433:5432"` — and nothing inside the stack cares,
since containers talk to each other on the internal network.

---

## Other small differences

**Python scripts.** `scripts/generate_activity.py` runs on the Windows host and
needs `psycopg`:

```powershell
pip install "psycopg[binary]"
python scripts\generate_activity.py --rate 2
```

**curl.** In PowerShell, `curl` is an alias for `Invoke-WebRequest` with
different arguments. Use `curl.exe` explicitly, or:

```powershell
Invoke-RestMethod http://localhost:8000/analytics/loss-ratio | ConvertTo-Json -Depth 5
```

**Docker Desktop must be running** before any command. Obvious until you spend
twenty minutes debugging "cannot connect to the Docker daemon".

**File watching.** If you edit DAGs from Windows while the repo sits in WSL,
Airflow may not notice changes promptly. Editing from inside WSL — VS Code with
the WSL extension handles this well — avoids it.
