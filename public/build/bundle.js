
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    //return type same as Writale structure
    function useStorage(key, initialValue) {
        let serialize = JSON.stringify; //the process of converting an object into a stream of bytes
        let deserialize = JSON.parse; //the reverse process is called deserialization
        // get stored value
        let storedValue = deserialize(localStorage.getItem(key));
        //if value exists return it otherwise use initial value
        let store = writable(storedValue ? storedValue : initialValue);
        // subscribe to the store and update local storage when it changes
        store.subscribe((value) => {
            localStorage.setItem(key, serialize(value));
        });
        return store;
    }

    /* src/components/AddTodo.svelte generated by Svelte v3.46.4 */

    const file$6 = "src/components/AddTodo.svelte";

    // (14:4) {#if todosAmount>0}
    function create_if_block$2(ctx) {
    	let input;
    	let t0;
    	let label;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			label.textContent = "Mark all as comjjjplete";
    			attr_dev(input, "id", "toggle-all");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "toggle-all svelte-67lnvm");
    			add_location(input, file$6, 14, 12, 343);
    			attr_dev(label, "aria-label", "Mark all as complete");
    			attr_dev(label, "for", "toggle-all");
    			attr_dev(label, "class", "svelte-67lnvm");
    			add_location(label, file$6, 17, 12, 466);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, label, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					input,
    					"click",
    					function () {
    						if (is_function(/*toggleCompleted*/ ctx[0])) /*toggleCompleted*/ ctx[0].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(14:4) {#if todosAmount>0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let form;
    	let t;
    	let input;
    	let mounted;
    	let dispose;
    	let if_block = /*todosAmount*/ ctx[1] > 0 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			if (if_block) if_block.c();
    			t = space();
    			input = element("input");
    			attr_dev(input, "id", "new-todo");
    			attr_dev(input, "class", "new-todo svelte-67lnvm");
    			attr_dev(input, "placeholder", "what needs to be done?");
    			attr_dev(input, "type", "text");
    			input.autofocus = true;
    			add_location(input, file$6, 21, 12, 608);
    			add_location(form, file$6, 12, 0, 260);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			if (if_block) if_block.m(form, null);
    			append_dev(form, t);
    			append_dev(form, input);
    			set_input_value(input, /*todo*/ ctx[2]);
    			input.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[3]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*todosAmount*/ ctx[1] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(form, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*todo*/ 4 && input.value !== /*todo*/ ctx[2]) {
    				set_input_value(input, /*todo*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AddTodo', slots, []);
    	let { toggleCompleted } = $$props;
    	let { addTodo } = $$props;
    	let { todosAmount } = $$props;
    	let todo = '';

    	function handleSubmit(event) {
    		//dont allow empty submititon
    		if (todo.trim() !== "") {
    			addTodo(todo);
    			$$invalidate(2, todo = '');
    		}
    	}

    	const writable_props = ['toggleCompleted', 'addTodo', 'todosAmount'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AddTodo> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		todo = this.value;
    		$$invalidate(2, todo);
    	}

    	$$self.$$set = $$props => {
    		if ('toggleCompleted' in $$props) $$invalidate(0, toggleCompleted = $$props.toggleCompleted);
    		if ('addTodo' in $$props) $$invalidate(4, addTodo = $$props.addTodo);
    		if ('todosAmount' in $$props) $$invalidate(1, todosAmount = $$props.todosAmount);
    	};

    	$$self.$capture_state = () => ({
    		toggleCompleted,
    		addTodo,
    		todosAmount,
    		todo,
    		handleSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ('toggleCompleted' in $$props) $$invalidate(0, toggleCompleted = $$props.toggleCompleted);
    		if ('addTodo' in $$props) $$invalidate(4, addTodo = $$props.addTodo);
    		if ('todosAmount' in $$props) $$invalidate(1, todosAmount = $$props.todosAmount);
    		if ('todo' in $$props) $$invalidate(2, todo = $$props.todo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [toggleCompleted, todosAmount, todo, handleSubmit, addTodo, input_input_handler];
    }

    class AddTodo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			toggleCompleted: 0,
    			addTodo: 4,
    			todosAmount: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AddTodo",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*toggleCompleted*/ ctx[0] === undefined && !('toggleCompleted' in props)) {
    			console.warn("<AddTodo> was created without expected prop 'toggleCompleted'");
    		}

    		if (/*addTodo*/ ctx[4] === undefined && !('addTodo' in props)) {
    			console.warn("<AddTodo> was created without expected prop 'addTodo'");
    		}

    		if (/*todosAmount*/ ctx[1] === undefined && !('todosAmount' in props)) {
    			console.warn("<AddTodo> was created without expected prop 'todosAmount'");
    		}
    	}

    	get toggleCompleted() {
    		throw new Error("<AddTodo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleCompleted(value) {
    		throw new Error("<AddTodo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addTodo() {
    		throw new Error("<AddTodo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addTodo(value) {
    		throw new Error("<AddTodo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get todosAmount() {
    		throw new Error("<AddTodo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todosAmount(value) {
    		throw new Error("<AddTodo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Todo.svelte generated by Svelte v3.46.4 */
    const file$5 = "src/components/Todo.svelte";

    // (63:1) {#if editing}
    function create_if_block$1(ctx) {
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			input.value = input_value_value = /*todo*/ ctx[0].text;
    			attr_dev(input, "type", "text");
    			input.autofocus = true;
    			attr_dev(input, "class", "edit svelte-8undi9");
    			add_location(input, file$5, 63, 2, 1565);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[9], false, false, false),
    					listen_dev(input, "blur", /*blur_handler*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*todo*/ 1 && input_value_value !== (input_value_value = /*todo*/ ctx[0].text) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(63:1) {#if editing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let li;
    	let div1;
    	let div0;
    	let input;
    	let input_checked_value;
    	let t0;
    	let label;
    	let t1;
    	let span;
    	let t2_value = /*todo*/ ctx[0].text + "";
    	let t2;
    	let t3;
    	let button;
    	let t4;
    	let mounted;
    	let dispose;
    	let if_block = /*editing*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = space();
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			button = element("button");
    			t4 = space();
    			if (if_block) if_block.c();
    			input.checked = input_checked_value = /*todo*/ ctx[0].completed;
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "todo");
    			attr_dev(input, "class", "toggle svelte-8undi9");
    			add_location(input, file$5, 39, 3, 1135);
    			attr_dev(label, "for", "todo");
    			attr_dev(label, "class", "todo-check svelte-8undi9");
    			add_location(label, file$5, 48, 3, 1291);
    			add_location(div0, file$5, 35, 2, 895);
    			attr_dev(span, "class", "todo-text svelte-8undi9");
    			toggle_class(span, "completed", /*todo*/ ctx[0].completed);
    			add_location(span, file$5, 50, 2, 1342);
    			attr_dev(button, "class", "remove svelte-8undi9");
    			add_location(button, file$5, 55, 2, 1457);
    			attr_dev(div1, "class", "todo-item svelte-8undi9");
    			add_location(div1, file$5, 34, 1, 869);
    			attr_dev(li, "class", "todo svelte-8undi9");
    			toggle_class(li, "editing", /*editing*/ ctx[3]);
    			add_location(li, file$5, 33, 0, 836);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			append_dev(div0, t0);
    			append_dev(div0, label);
    			append_dev(div1, t1);
    			append_dev(div1, span);
    			append_dev(span, t2);
    			append_dev(div1, t3);
    			append_dev(div1, button);
    			append_dev(li, t4);
    			if (if_block) if_block.m(li, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*change_handler*/ ctx[7], false, false, false),
    					listen_dev(span, "dblclick", /*toggleEdit*/ ctx[4], false, false, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*todo*/ 1 && input_checked_value !== (input_checked_value = /*todo*/ ctx[0].completed)) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty & /*todo*/ 1 && t2_value !== (t2_value = /*todo*/ ctx[0].text + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*todo*/ 1) {
    				toggle_class(span, "completed", /*todo*/ ctx[0].completed);
    			}

    			if (/*editing*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(li, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*editing*/ 8) {
    				toggle_class(li, "editing", /*editing*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function handleEdit(event, id) {
    	let pressedKey = event.key;
    	let targetElement = event.target;
    	targetElement.value;

    	switch (pressedKey) {
    		case "Escape":
    			targetElement.blur();
    			break;
    		case "Enter":
    			//its working even without the function
    			//  editTodo(id,newTodo)
    			targetElement.blur();
    			break;
    	} //when element lose focus
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Todo', slots, []);
    	let { todo } = $$props;
    	let { completeTodo } = $$props;
    	let { removeTodo } = $$props;
    	let { editTodo } = $$props;
    	let editing = false;

    	function toggleEdit() {
    		$$invalidate(3, editing = true);
    	}

    	function handleBlur(event, id) {
    		let targetElement = event.target;
    		let newTodo = targetElement.value;
    		editTodo(id, newTodo);
    		targetElement.blur();
    		$$invalidate(3, editing = false);
    	}

    	const writable_props = ['todo', 'completeTodo', 'removeTodo', 'editTodo'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Todo> was created with unknown prop '${key}'`);
    	});

    	const change_handler = () => {
    		completeTodo(todo.id);
    	};

    	const click_handler = () => {
    		removeTodo(todo.id);
    	};

    	const keydown_handler = event => {
    		handleEdit(event, todo.id);
    	};

    	const blur_handler = event => {
    		handleBlur(event, todo.id);
    	};

    	$$self.$$set = $$props => {
    		if ('todo' in $$props) $$invalidate(0, todo = $$props.todo);
    		if ('completeTodo' in $$props) $$invalidate(1, completeTodo = $$props.completeTodo);
    		if ('removeTodo' in $$props) $$invalidate(2, removeTodo = $$props.removeTodo);
    		if ('editTodo' in $$props) $$invalidate(6, editTodo = $$props.editTodo);
    	};

    	$$self.$capture_state = () => ({
    		todo,
    		completeTodo,
    		removeTodo,
    		editTodo,
    		editing,
    		toggleEdit,
    		handleEdit,
    		handleBlur
    	});

    	$$self.$inject_state = $$props => {
    		if ('todo' in $$props) $$invalidate(0, todo = $$props.todo);
    		if ('completeTodo' in $$props) $$invalidate(1, completeTodo = $$props.completeTodo);
    		if ('removeTodo' in $$props) $$invalidate(2, removeTodo = $$props.removeTodo);
    		if ('editTodo' in $$props) $$invalidate(6, editTodo = $$props.editTodo);
    		if ('editing' in $$props) $$invalidate(3, editing = $$props.editing);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todo,
    		completeTodo,
    		removeTodo,
    		editing,
    		toggleEdit,
    		handleBlur,
    		editTodo,
    		change_handler,
    		click_handler,
    		keydown_handler,
    		blur_handler
    	];
    }

    class Todo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			todo: 0,
    			completeTodo: 1,
    			removeTodo: 2,
    			editTodo: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todo",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*todo*/ ctx[0] === undefined && !('todo' in props)) {
    			console.warn("<Todo> was created without expected prop 'todo'");
    		}

    		if (/*completeTodo*/ ctx[1] === undefined && !('completeTodo' in props)) {
    			console.warn("<Todo> was created without expected prop 'completeTodo'");
    		}

    		if (/*removeTodo*/ ctx[2] === undefined && !('removeTodo' in props)) {
    			console.warn("<Todo> was created without expected prop 'removeTodo'");
    		}

    		if (/*editTodo*/ ctx[6] === undefined && !('editTodo' in props)) {
    			console.warn("<Todo> was created without expected prop 'editTodo'");
    		}
    	}

    	get todo() {
    		throw new Error("<Todo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todo(value) {
    		throw new Error("<Todo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get completeTodo() {
    		throw new Error("<Todo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completeTodo(value) {
    		throw new Error("<Todo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get removeTodo() {
    		throw new Error("<Todo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set removeTodo(value) {
    		throw new Error("<Todo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editTodo() {
    		throw new Error("<Todo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editTodo(value) {
    		throw new Error("<Todo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TodosLeft.svelte generated by Svelte v3.46.4 */

    const file$4 = "src/components/TodosLeft.svelte";

    function create_fragment$4(ctx) {
    	let span;
    	let t0;
    	let t1;
    	let t2_value = (/*remaingTodos*/ ctx[0] === 1 ? 'item' : 'items') + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*remaingTodos*/ ctx[0]);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = text(" \n                    left");
    			attr_dev(span, "class", "todo-count");
    			add_location(span, file$4, 2, 4, 57);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(span, t3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*remaingTodos*/ 1) set_data_dev(t0, /*remaingTodos*/ ctx[0]);
    			if (dirty & /*remaingTodos*/ 1 && t2_value !== (t2_value = (/*remaingTodos*/ ctx[0] === 1 ? 'item' : 'items') + "")) set_data_dev(t2, t2_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodosLeft', slots, []);
    	let { remaingTodos } = $$props;
    	const writable_props = ['remaingTodos'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodosLeft> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('remaingTodos' in $$props) $$invalidate(0, remaingTodos = $$props.remaingTodos);
    	};

    	$$self.$capture_state = () => ({ remaingTodos });

    	$$self.$inject_state = $$props => {
    		if ('remaingTodos' in $$props) $$invalidate(0, remaingTodos = $$props.remaingTodos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [remaingTodos];
    }

    class TodosLeft extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { remaingTodos: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodosLeft",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*remaingTodos*/ ctx[0] === undefined && !('remaingTodos' in props)) {
    			console.warn("<TodosLeft> was created without expected prop 'remaingTodos'");
    		}
    	}

    	get remaingTodos() {
    		throw new Error("<TodosLeft>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set remaingTodos(value) {
    		throw new Error("<TodosLeft>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/FilterTodos.svelte generated by Svelte v3.46.4 */

    const file$3 = "src/components/FilterTodos.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (7:4) {#each filters as filter}
    function create_each_block$1(ctx) {
    	let button;
    	let t0_value = /*filter*/ ctx[4] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*filter*/ ctx[4]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(button, "class", "filter svelte-1lhg24h");
    			toggle_class(button, "selected", /*selectedFilter*/ ctx[0] === /*filter*/ ctx[4]);
    			add_location(button, file$3, 7, 4, 180);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*selectedFilter, filters*/ 5) {
    				toggle_class(button, "selected", /*selectedFilter*/ ctx[0] === /*filter*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(7:4) {#each filters as filter}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let each_value = /*filters*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "filters svelte-1lhg24h");
    			add_location(div, file$3, 5, 0, 124);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedFilter, filters, setFilter*/ 7) {
    				each_value = /*filters*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FilterTodos', slots, []);
    	let { selectedFilter } = $$props;
    	let { setFilter } = $$props;
    	let filters = ['all', 'active', 'completed'];
    	const writable_props = ['selectedFilter', 'setFilter'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FilterTodos> was created with unknown prop '${key}'`);
    	});

    	const click_handler = filter => setFilter(filter);

    	$$self.$$set = $$props => {
    		if ('selectedFilter' in $$props) $$invalidate(0, selectedFilter = $$props.selectedFilter);
    		if ('setFilter' in $$props) $$invalidate(1, setFilter = $$props.setFilter);
    	};

    	$$self.$capture_state = () => ({ selectedFilter, setFilter, filters });

    	$$self.$inject_state = $$props => {
    		if ('selectedFilter' in $$props) $$invalidate(0, selectedFilter = $$props.selectedFilter);
    		if ('setFilter' in $$props) $$invalidate(1, setFilter = $$props.setFilter);
    		if ('filters' in $$props) $$invalidate(2, filters = $$props.filters);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selectedFilter, setFilter, filters, click_handler];
    }

    class FilterTodos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { selectedFilter: 0, setFilter: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FilterTodos",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*selectedFilter*/ ctx[0] === undefined && !('selectedFilter' in props)) {
    			console.warn("<FilterTodos> was created without expected prop 'selectedFilter'");
    		}

    		if (/*setFilter*/ ctx[1] === undefined && !('setFilter' in props)) {
    			console.warn("<FilterTodos> was created without expected prop 'setFilter'");
    		}
    	}

    	get selectedFilter() {
    		throw new Error("<FilterTodos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedFilter(value) {
    		throw new Error("<FilterTodos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setFilter() {
    		throw new Error("<FilterTodos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setFilter(value) {
    		throw new Error("<FilterTodos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ClearTodos.svelte generated by Svelte v3.46.4 */

    const file$2 = "src/components/ClearTodos.svelte";

    function create_fragment$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Clear completed";
    			attr_dev(button, "class", "clear-completed");
    			toggle_class(button, "hidden", /*completedTodos*/ ctx[1] === 0);
    			add_location(button, file$2, 3, 4, 86);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*clearCompleted*/ ctx[0])) /*clearCompleted*/ ctx[0].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*completedTodos*/ 2) {
    				toggle_class(button, "hidden", /*completedTodos*/ ctx[1] === 0);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ClearTodos', slots, []);
    	let { clearCompleted } = $$props;
    	let { completedTodos } = $$props;
    	const writable_props = ['clearCompleted', 'completedTodos'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ClearTodos> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('clearCompleted' in $$props) $$invalidate(0, clearCompleted = $$props.clearCompleted);
    		if ('completedTodos' in $$props) $$invalidate(1, completedTodos = $$props.completedTodos);
    	};

    	$$self.$capture_state = () => ({ clearCompleted, completedTodos });

    	$$self.$inject_state = $$props => {
    		if ('clearCompleted' in $$props) $$invalidate(0, clearCompleted = $$props.clearCompleted);
    		if ('completedTodos' in $$props) $$invalidate(1, completedTodos = $$props.completedTodos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clearCompleted, completedTodos];
    }

    class ClearTodos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { clearCompleted: 0, completedTodos: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ClearTodos",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*clearCompleted*/ ctx[0] === undefined && !('clearCompleted' in props)) {
    			console.warn("<ClearTodos> was created without expected prop 'clearCompleted'");
    		}

    		if (/*completedTodos*/ ctx[1] === undefined && !('completedTodos' in props)) {
    			console.warn("<ClearTodos> was created without expected prop 'completedTodos'");
    		}
    	}

    	get clearCompleted() {
    		throw new Error("<ClearTodos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clearCompleted(value) {
    		throw new Error("<ClearTodos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get completedTodos() {
    		throw new Error("<ClearTodos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completedTodos(value) {
    		throw new Error("<ClearTodos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Todos.svelte generated by Svelte v3.46.4 */

    const { Object: Object_1 } = globals;
    const file$1 = "src/components/Todos.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (105:2) {#if todosAmount}
    function create_if_block(ctx) {
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let div;
    	let todosleft;
    	let t1;
    	let filtertods;
    	let t2;
    	let cleartodos;
    	let current;
    	let each_value = /*filteredTodos*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*todo*/ ctx[15].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	todosleft = new TodosLeft({
    			props: { remaingTodos: /*incompleteTodos*/ ctx[4] },
    			$$inline: true
    		});

    	filtertods = new FilterTodos({
    			props: {
    				selectedFilter: /*selectedFilter*/ ctx[0],
    				setFilter: /*setFilter*/ ctx[11]
    			},
    			$$inline: true
    		});

    	cleartodos = new ClearTodos({
    			props: {
    				clearCompleted: /*clearCompleted*/ ctx[12],
    				completedTodos: /*completedTodos*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div = element("div");
    			create_component(todosleft.$$.fragment);
    			t1 = space();
    			create_component(filtertods.$$.fragment);
    			t2 = space();
    			create_component(cleartodos.$$.fragment);
    			add_location(ul, file$1, 106, 3, 3089);
    			attr_dev(div, "class", "actions");
    			add_location(div, file$1, 114, 3, 3301);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(todosleft, div, null);
    			append_dev(div, t1);
    			mount_component(filtertods, div, null);
    			append_dev(div, t2);
    			mount_component(cleartodos, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredTodos, completeTodo, removeTodo, editTodo*/ 1800) {
    				each_value = /*filteredTodos*/ ctx[3];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}

    			const todosleft_changes = {};
    			if (dirty & /*incompleteTodos*/ 16) todosleft_changes.remaingTodos = /*incompleteTodos*/ ctx[4];
    			todosleft.$set(todosleft_changes);
    			const filtertods_changes = {};
    			if (dirty & /*selectedFilter*/ 1) filtertods_changes.selectedFilter = /*selectedFilter*/ ctx[0];
    			filtertods.$set(filtertods_changes);
    			const cleartodos_changes = {};
    			if (dirty & /*completedTodos*/ 4) cleartodos_changes.completedTodos = /*completedTodos*/ ctx[2];
    			cleartodos.$set(cleartodos_changes);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(todosleft.$$.fragment, local);
    			transition_in(filtertods.$$.fragment, local);
    			transition_in(cleartodos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(todosleft.$$.fragment, local);
    			transition_out(filtertods.$$.fragment, local);
    			transition_out(cleartodos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			destroy_component(todosleft);
    			destroy_component(filtertods);
    			destroy_component(cleartodos);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(105:2) {#if todosAmount}",
    		ctx
    	});

    	return block;
    }

    // (109:4) {#each filteredTodos as todo (todo.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let todo;
    	let current;

    	todo = new Todo({
    			props: {
    				todo: /*todo*/ ctx[15],
    				completeTodo: /*completeTodo*/ ctx[8],
    				removeTodo: /*removeTodo*/ ctx[9],
    				editTodo: /*editTodo*/ ctx[10]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(todo.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(todo, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const todo_changes = {};
    			if (dirty & /*filteredTodos*/ 8) todo_changes.todo = /*todo*/ ctx[15];
    			todo.$set(todo_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(todo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(109:4) {#each filteredTodos as todo (todo.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let section;
    	let addtodo;
    	let t2;
    	let current;

    	addtodo = new AddTodo({
    			props: {
    				addTodo: /*addTodo*/ ctx[6],
    				toggleCompleted: /*toggleCompleted*/ ctx[7],
    				todosAmount: /*todosAmount*/ ctx[5]
    			},
    			$$inline: true
    		});

    	let if_block = /*todosAmount*/ ctx[5] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Todos";
    			t1 = space();
    			section = element("section");
    			create_component(addtodo.$$.fragment);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "title");
    			add_location(h1, file$1, 99, 1, 2929);
    			attr_dev(section, "class", "todos");
    			add_location(section, file$1, 101, 1, 2960);
    			add_location(main, file$1, 98, 0, 2921);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, section);
    			mount_component(addtodo, section, null);
    			append_dev(section, t2);
    			if (if_block) if_block.m(section, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const addtodo_changes = {};
    			if (dirty & /*todosAmount*/ 32) addtodo_changes.todosAmount = /*todosAmount*/ ctx[5];
    			addtodo.$set(addtodo_changes);

    			if (/*todosAmount*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*todosAmount*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(section, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(addtodo.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(addtodo.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(addtodo);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function genrateRandomNumbers() {
    	//tosSring(16) to convert it to hex, slice because without slice
    	//it will be like 0.12232, but with slice 12232
    	return Math.random().toString(16).slice(2);
    }

    function filterTodos(todos, filter) {
    	switch (filter) {
    		case 'all':
    			return todos;
    		case 'active':
    			return todos.filter(todo => !todo.completed);
    		case 'completed':
    			return todos.filter(todo => todo.completed);
    	} //no need to break,because using return 
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let todosAmount;
    	let incompleteTodos;
    	let remaingTodos;
    	let filteredTodos;
    	let completedTodos;
    	let $todos;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Todos', slots, []);
    	let todos = useStorage('todos', []);
    	validate_store(todos, 'todos');
    	component_subscribe($$self, todos, value => $$invalidate(13, $todos = value));
    	let selectedFilter = 'all';

    	function addTodo(todo) {
    		let newTodo = {
    			id: genrateRandomNumbers(),
    			text: todo,
    			completed: false
    		};

    		set_store_value(todos, $todos = [...$todos, newTodo], $todos);
    	}

    	//to toggle all todos
    	function toggleCompleted(event) {
    		let { checked } = event.target;

    		//read the comment below the right answer to understand the map thing
    		//https://stackoverflow.com/questions/47841899/js-map-return-object
    		set_store_value(todos, $todos = $todos.map(todo => Object.assign(Object.assign({}, todo), { completed: checked })), $todos);
    	}

    	function completeTodo(id) {
    		set_store_value(
    			todos,
    			$todos = $todos.map(todo => {
    				if (todo.id == id) {
    					todo.completed = !todo.completed;
    				}

    				return todo;
    			}),
    			$todos
    		);
    	} //same as
    	// todos.forEach((todo,index)=>{

    	// 		if(todo.id===id){
    	// 			todo.completed=!todo.completed;
    	// 			todos[index]=todo
    	// 		}
    	// })
    	function removeTodo(id) {
    		set_store_value(
    			todos,
    			$todos = $todos.filter(todo => {
    				return todo.id !== id;
    			}),
    			$todos
    		);
    	}

    	function editTodo(id, content) {
    		let theIndex = $todos.findIndex(todo => todo.id === id);
    		$$invalidate(1, todos[theIndex].text = content, todos);
    	}

    	function setFilter(newFilter) {
    		$$invalidate(0, selectedFilter = newFilter);
    	}

    	function clearCompleted() {
    		set_store_value(todos, $todos = $todos.filter(todo => todo.completed !== true), $todos);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Todos> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		useStorage,
    		AddTodo,
    		Todo,
    		TodosLeft,
    		FilterTods: FilterTodos,
    		ClearTodos,
    		todos,
    		selectedFilter,
    		genrateRandomNumbers,
    		addTodo,
    		toggleCompleted,
    		completeTodo,
    		removeTodo,
    		editTodo,
    		setFilter,
    		filterTodos,
    		clearCompleted,
    		completedTodos,
    		filteredTodos,
    		remaingTodos,
    		incompleteTodos,
    		todosAmount,
    		$todos
    	});

    	$$self.$inject_state = $$props => {
    		if ('todos' in $$props) $$invalidate(1, todos = $$props.todos);
    		if ('selectedFilter' in $$props) $$invalidate(0, selectedFilter = $$props.selectedFilter);
    		if ('completedTodos' in $$props) $$invalidate(2, completedTodos = $$props.completedTodos);
    		if ('filteredTodos' in $$props) $$invalidate(3, filteredTodos = $$props.filteredTodos);
    		if ('remaingTodos' in $$props) remaingTodos = $$props.remaingTodos;
    		if ('incompleteTodos' in $$props) $$invalidate(4, incompleteTodos = $$props.incompleteTodos);
    		if ('todosAmount' in $$props) $$invalidate(5, todosAmount = $$props.todosAmount);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$todos*/ 8192) {
    			$$invalidate(5, todosAmount = $todos.length);
    		}

    		if ($$self.$$.dirty & /*$todos*/ 8192) {
    			// $:remaing=todos.map(todo=>{
    			// 	if(todo.completed==true)
    			// 	{
    			// 		return todo;
    			// 	}
    			// }) 
    			//same thing---
    			$$invalidate(4, incompleteTodos = $todos.filter(todo => !todo.completed).length);
    		}

    		if ($$self.$$.dirty & /*$todos*/ 8192) {
    			remaingTodos = $todos.filter(todo => {
    				if (!todo.completed) {
    					return todo;
    				}
    			}).length;
    		}

    		if ($$self.$$.dirty & /*$todos, selectedFilter*/ 8193) {
    			//-------------
    			$$invalidate(3, filteredTodos = filterTodos($todos, selectedFilter));
    		}

    		if ($$self.$$.dirty & /*$todos*/ 8192) {
    			$$invalidate(2, completedTodos = $todos.filter(todo => todo.completed).length);
    		}
    	};

    	return [
    		selectedFilter,
    		todos,
    		completedTodos,
    		filteredTodos,
    		incompleteTodos,
    		todosAmount,
    		addTodo,
    		toggleCompleted,
    		completeTodo,
    		removeTodo,
    		editTodo,
    		setFilter,
    		clearCompleted,
    		$todos
    	];
    }

    class Todos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todos",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.4 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let todos;
    	let current;
    	todos = new Todos({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(todos.$$.fragment);
    			add_location(main, file, 4, 0, 112);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(todos, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(todos);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Todos });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
