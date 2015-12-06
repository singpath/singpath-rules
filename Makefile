# Conveniant task to speed up runing tests; the rules will be rebuilt
# and uploaded only if they have been updated.
# 

default: rules.json

.upload.stamp: rules.json
	# SINGPATH_RULES_FB_ID should be set.
	# 
	# example:
	# 
	#   export SINGPATH_RULES_FB_ID=singpath-dev"
	#   
	npm run upload-rules
	date > $@

e2e: .upload.stamp
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

rules.json: rules/*.bolt extra-rules.json
	npm run all-rules

test:
	npm run test
.PHONY: tests

upload: .upload.stamp
.PHONY: upload
