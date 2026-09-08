FROM apache/airflow:2.9.3-python3.11

USER root
# Spark jobs are submitted from this container, so it needs a JRE
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-jre-headless procps \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

USER airflow
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY land_to_bronze.py /opt/airflow/land_to_bronze.py
