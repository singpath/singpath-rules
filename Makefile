# Conveniant tasks to speed up runing tests; the rules will be rebuilt
# and uploaded only if they have been updated.
# 
# Makefile primer:
#
# - Writing tasks: https://www.gnu.org/software/make/manual/html_node/Rule-Introduction.html
# - default task: https://www.gnu.org/software/make/manual/html_node/How-Make-Works.html 
# - phony tasks: https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html
# - Automatic variables (like $@): https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html
#


default: rules.json
.PHONY: default

.upload-rules.${SINGPATH_RULES_FB_ID}.stamp: rules
	# SINGPATH_RULES_FB_ID should be set.
	# 
	# example:
	# 
	#   export SINGPATH_RULES_FB_ID=singpath-dev"
	#   
	npm run upload-rules
	date > $@

.upload-data.${SINGPATH_RULES_FB_ID}.stamp: ./data/classMentors/*.json
	# SINGPATH_RULES_FB_ID should be set.
	# 
	# example:
	# 
	#   export SINGPATH_RULES_FB_ID=singpath-dev"
	#   
	npm run upload-data
	date > $@

rules.json: rules/*.bolt extra-rules.json
	npm run all-rules

e2e: .upload-rules.${SINGPATH_RULES_FB_ID}.stamp
	# SINGPATH_RULES_FB_SECRET and SINGPATH_RULES_FB_ID should be set.
	# 
	# example:
	# 
	#   export SINGPATH_RULES_FB_ID=singpath-dev"
	#   export SINGPATH_RULES_FB_SECRET=xxxxxxx
	#   
	npm run test-e2e
.PHONY: e2e

rules: rules.json
.PHONY: rules

test:
	npm run test
.PHONY: tests

upload-rules: .upload-rules.${SINGPATH_RULES_FB_ID}.stamp
.PHONY: upload-rules

upload-data: .upload-data.${SINGPATH_RULES_FB_ID}.stamp
.PHONY: upload-data
