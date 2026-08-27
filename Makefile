.PHONY: install run build start test typecheck i18n check clean

## Dependencies (needs a GitHub Packages token in ~/.npmrc for @getsafedeal/design-system)
install:
	npm install

## Run the app (http://localhost:3005 — 3000 is taken by another app)
run:
	npm run dev

build:
	npm run build

start:
	npm run build && npm run start

## Checks — `check` is what must pass before a commit
test:
	npm run test

typecheck:
	npm run typecheck

i18n:
	npm run check:i18n

check:
	npm run check

## Housekeeping
clean:
	rm -rf .next node_modules/.cache tsconfig.tsbuildinfo
