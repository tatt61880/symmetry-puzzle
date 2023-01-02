all: node_modules
	npm run test
	npm run eslint
	npm run htmlhint
	npm run stylelint

node_modules:
	npm install

solve:
	npm run solve -- --id 1 --max 5
