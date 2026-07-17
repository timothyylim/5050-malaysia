# 50-50 Malaysia — common tasks. Run `make` to see this list.
.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  make %-10s %s\n", $$1, $$2}'

preview: ## Local live preview at http://127.0.0.1:1313
	@./scripts/preview.sh

build: ## Build the static site into public/
	@hugo --gc --minify

publish: ## Build, commit, push, rebuild on Arrakis, verify.  make publish m="message"
	@./scripts/publish.sh "$(m)"

verify: ## Check the live site (hits Arrakis origin, ignores stale DNS)
	@./scripts/verify-live.sh

sync: ## Just trigger the Arrakis rebuild from GitHub (no local commit)
	@ssh $${ARRAKIS_SSH:-tim@168.144.107.250} 'sudo systemctl start 5050-malaysia-hugo-sync.service && sleep 6 && systemctl status 5050-malaysia-hugo-sync.service --no-pager -l | tail -3'

.PHONY: help preview build publish verify sync
