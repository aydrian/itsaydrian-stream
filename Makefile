.PHONY: build

# CRATES = $(dir $(wildcard ./crates/*/))
# CRATES_2 = $(bash -c "fd . --base-directory ./target/x86_64-unknown-linux-musl/release/ -d1 -tx")
# CRATES_3 = $(dir $(wildcard ./crates/*/))
# CRATE_NAMES := $(shell fd . --base-directory ./target/x86_64-unknown-linux-musl/release/ -d1 -tx)

# build:
# 	@echo $(CRATES)
# 	for crate in $(CRATES) ; do \
# 		RUSTFLAGS='-C link-arg=-s' cargo install --path $$crate --root bins --target x86_64-unknown-linux-musl ;\
# 	done
# 	mkdir -p netlify/functions
# 	cp bins/bin/* netlify/functions/
# 	ls netlify/functions

# build:
# 	RUSTFLAGS='-C link-arg=-s' cargo build --release --target x86_64-unknown-linux-musl
# 	mkdir -p functions
# 	for crate in $(CRATE_NAMES) ; do \
# 		cp "target/x86_64-unknown-linux-musl/release/$$crate" functions/; \
# 	done
# 	@ls functions

build:
		@cargo build --release --target x86_64-unknown-linux-musl
		@mkdir -p netlify/functions
		@cp target/x86_64-unknown-linux-musl/release/twitch_user netlify/functions

local:
	cargo build --release --target x86_64-unknown-linux-musl
	fd . --base-directory ./target/x86_64-unknown-linux-musl/release/ -d1 -tx | xargs -n1 printf "target/x86_64-unknown-linux-musl/release/%s functions/ " | xargs -n2 cp