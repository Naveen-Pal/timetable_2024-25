.PHONY: help install test lint format clean run

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	pip install -r requirements.txt

test: ## Run tests
	pytest test_app.py -v

lint: ## Run code quality checks
	flake8 app.py test_app.py --max-line-length=127 --statistics || true
	black --check app.py test_app.py || true
	isort --check-only app.py test_app.py || true

format: ## Format code
	black app.py test_app.py
	isort app.py test_app.py

clean: ## Clean up temporary files
	rm -rf __pycache__/
	rm -rf .pytest_cache/
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete

run: ## Run the Flask application
	python app.py 