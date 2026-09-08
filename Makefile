.PHONY: up down cdc seed-stream logs smoke batch dbt reset ps

up:                ## bring the whole platform up
	docker compose up -d --build
	@echo "waiting 45s for services to settle..."
	@sleep 45
	./connect/register.sh

down:
	docker compose down

reset:             ## nuke volumes and start clean
	docker compose down -v
	docker compose up -d --build

cdc:               ## (re)register the Debezium connector
	./connect/register.sh

seed-stream:       ## generate live OLTP activity for the demo
	python3 scripts/generate_activity.py --rate 2

batch:             ## trigger the batch DAG manually
	docker exec rs-airflow airflow dags trigger royal_batch_pipeline

dbt:
	docker exec rs-airflow bash -c "cd /opt/dbt && dbt run --profiles-dir . && dbt test --profiles-dir ."

smoke:
	./scripts/smoke_test.sh

ps:
	docker compose ps

logs:
	docker compose logs -f --tail=50
