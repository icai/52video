//jquery.form 2.77
(function($) {
    $.fn.ajaxSubmit = function(options) {
        if (!this.length) {
            log("ajaxSubmit: skipping submit process - no element selected");
            return this;
        }
        if (typeof options == "function") {
            options = {
                success:options
            };
        }
        var action = this.attr("action");
        var url = typeof action === "string" ? $.trim(action) :"";
        url = url || window.location.href || "";
        if (url) {
            url = (url.match(/^([^#]+)/) || [])[1];
        }
        options = $.extend(true, {
            url:url,
            success:$.ajaxSettings.success,
            type:this[0].getAttribute("method") || "GET",
            iframeSrc:/^https/i.test(window.location.href || "") ? "javascript:false" :"about:blank"
        }, options);
        var veto = {};
        this.trigger("form-pre-serialize", [ this, options, veto ]);
        if (veto.veto) {
            log("ajaxSubmit: submit vetoed via form-pre-serialize trigger");
            return this;
        }
        if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
            log("ajaxSubmit: submit aborted via beforeSerialize callback");
            return this;
        }
        var n, v, a = this.formToArray(options.semantic);
        if (options.data) {
            options.extraData = options.data;
            for (n in options.data) {
                if (options.data[n] instanceof Array) {
                    for (var k in options.data[n]) {
                        a.push({
                            name:n,
                            value:options.data[n][k]
                        });
                    }
                } else {
                    v = options.data[n];
                    v = $.isFunction(v) ? v() :v;
                    a.push({
                        name:n,
                        value:v
                    });
                }
            }
        }
        if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
            log("ajaxSubmit: submit aborted via beforeSubmit callback");
            return this;
        }
        this.trigger("form-submit-validate", [ a, this, options, veto ]);
        if (veto.veto) {
            log("ajaxSubmit: submit vetoed via form-submit-validate trigger");
            return this;
        }
        var q = $.param(a);
        if (options.type.toUpperCase() == "GET") {
            options.url += (options.url.indexOf("?") >= 0 ? "&" :"?") + q;
            options.data = null;
        } else {
            options.data = q;
        }
        var $form = this, callbacks = [];
        if (options.resetForm) {
            callbacks.push(function() {
                $form.resetForm();
            });
        }
        if (options.clearForm) {
            callbacks.push(function() {
                $form.clearForm();
            });
        }
        if (!options.dataType && options.target) {
            var oldSuccess = options.success || function() {};
            callbacks.push(function(data) {
                var fn = options.replaceTarget ? "replaceWith" :"html";
                $(options.target)[fn](data).each(oldSuccess, arguments);
            });
        } else if (options.success) {
            callbacks.push(options.success);
        }
        options.success = function(data, status, xhr) {
            var context = options.context || options;
            for (var i = 0, max = callbacks.length; i < max; i++) {
                callbacks[i].apply(context, [ data, status, xhr || $form, $form ]);
            }
        };
        var fileInputs = $("input:file", this).length > 0;
        var mp = "multipart/form-data";
        var multipart = $form.attr("enctype") == mp || $form.attr("encoding") == mp;
        if (options.iframe !== false && (fileInputs || options.iframe || multipart)) {
            if (options.closeKeepAlive) {
                $.get(options.closeKeepAlive, fileUpload);
            } else {
                fileUpload();
            }
        } else {
            $.ajax(options);
        }
        this.trigger("form-submit-notify", [ this, options ]);
        return this;
        function fileUpload() {
            var form = $form[0], s, g, id, $io, io, xhr, sub, n, timedOut, timeoutHandle;
            if ($(":input[name=submit],:input[id=submit]", form).length) {
                alert('Error: Form elements must not have name or id of "submit".');
                return;
            }
            s = $.extend(true, {}, $.ajaxSettings, options);
            s.context = s.context || s;
            $io, id = "jqFormIO" + new Date().getTime();
            if (s.iframeTarget) {
                $io = $(s.iframeTarget);
                n = $io.attr("name");
                if (n == null) $io.attr("name", id); else id = n;
            } else {
                $io = $('<iframe name="' + id + '" src="' + s.iframeSrc + '" />');
                $io.css({
                    position:"absolute",
                    top:"-1000px",
                    left:"-1000px"
                });
            }
            io = $io[0];
            xhr = {
                aborted:0,
                responseText:null,
                responseXML:null,
                status:0,
                statusText:"n/a",
                getAllResponseHeaders:function() {},
                getResponseHeader:function() {},
                setRequestHeader:function() {},
                abort:function(status) {
                    var e = status === "timeout" ? "timeout" :"aborted";
                    log("aborting upload... " + e);
                    this.aborted = 1;
                    $io.attr("src", s.iframeSrc);
                    xhr.error = e;
                    s.error && s.error.call(s.context, xhr, e, e);
                    g && $.event.trigger("ajaxError", [ xhr, s, e ]);
                    s.complete && s.complete.call(s.context, xhr, e);
                }
            };
            g = s.global;
            if (g && !$.active++) {
                $.event.trigger("ajaxStart");
            }
            if (g) {
                $.event.trigger("ajaxSend", [ xhr, s ]);
            }
            if (s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false) {
                if (s.global) {
                    $.active--;
                }
                return;
            }
            if (xhr.aborted) {
                return;
            }
            sub = form.clk;
            if (sub) {
                n = sub.name;
                if (n && !sub.disabled) {
                    s.extraData = s.extraData || {};
                    s.extraData[n] = sub.value;
                    if (sub.type == "image") {
                        s.extraData[n + ".x"] = form.clk_x;
                        s.extraData[n + ".y"] = form.clk_y;
                    }
                }
            }
            function doSubmit() {
                var t = $form.attr("target"), a = $form.attr("action");
                form.setAttribute("target", id);
                if (form.getAttribute("method") != "POST") {
                    form.setAttribute("method", "POST");
                }
                if (form.getAttribute("action") != s.url) {
                    form.setAttribute("action", s.url);
                }
                if (!s.skipEncodingOverride) {
                    $form.attr({
                        encoding:"multipart/form-data",
                        enctype:"multipart/form-data"
                    });
                }
                if (s.timeout) {
                    timeoutHandle = setTimeout(function() {
                        timedOut = true;
                        cb(true);
                    }, s.timeout);
                }
                var extraInputs = [];
                try {
                    if (s.extraData) {
                        for (var n in s.extraData) {
                            extraInputs.push($('<input type="hidden" name="' + n + '" value="' + s.extraData[n] + '" />').appendTo(form)[0]);
                        }
                    }
                    if (!s.iframeTarget) {
                        $io.appendTo("body");
                        io.attachEvent ? io.attachEvent("onload", cb) :io.addEventListener("load", cb, false);
                    }
                    form.submit();
                } finally {
                    form.setAttribute("action", a);
                    if (t) {
                        form.setAttribute("target", t);
                    } else {
                        $form.removeAttr("target");
                    }
                    $(extraInputs).remove();
                }
            }
            if (s.forceSync) {
                doSubmit();
            } else {
                setTimeout(doSubmit, 10);
            }
            var data, doc, domCheckCount = 50, callbackProcessed;
            function cb(e) {
                if (xhr.aborted || callbackProcessed) {
                    return;
                }
                if (e === true && xhr) {
                    xhr.abort("timeout");
                    return;
                }
                var doc = io.contentWindow ? io.contentWindow.document :io.contentDocument ? io.contentDocument :io.document;
                if (!doc || doc.location.href == s.iframeSrc) {
                    if (!timedOut) return;
                }
                io.detachEvent ? io.detachEvent("onload", cb) :io.removeEventListener("load", cb, false);
                var status = "success", errMsg;
                try {
                    if (timedOut) {
                        throw "timeout";
                    }
                    var isXml = s.dataType == "xml" || doc.XMLDocument || $.isXMLDoc(doc);
                    log("isXml=" + isXml);
                    if (!isXml && window.opera && (doc.body == null || doc.body.innerHTML == "")) {
                        if (--domCheckCount) {
                            log("requeing onLoad callback, DOM not available");
                            setTimeout(cb, 250);
                            return;
                        }
                    }
                    var docRoot = doc.body ? doc.body :doc.documentElement;
                    xhr.responseText = docRoot ? docRoot.innerHTML :null;
                    xhr.responseXML = doc.XMLDocument ? doc.XMLDocument :doc;
                    if (isXml) s.dataType = "xml";
                    xhr.getResponseHeader = function(header) {
                        var headers = {
                            "content-type":s.dataType
                        };
                        return headers[header];
                    };
                    if (docRoot) {
                        xhr.status = Number(docRoot.getAttribute("status")) || xhr.status;
                        xhr.statusText = docRoot.getAttribute("statusText") || xhr.statusText;
                    }
                    var scr = /(json|script|text)/.test(s.dataType.toLowerCase());
                    if (scr || s.textarea) {
                        var ta = doc.getElementsByTagName("textarea")[0];
                        if (ta) {
                            xhr.responseText = ta.value;
                            xhr.status = Number(ta.getAttribute("status")) || xhr.status;
                            xhr.statusText = ta.getAttribute("statusText") || xhr.statusText;
                        } else if (scr) {
                            var pre = doc.getElementsByTagName("pre")[0];
                            var b = doc.getElementsByTagName("body")[0];
                            if (pre) {
                                xhr.responseText = pre.textContent ? pre.textContent :pre.innerHTML;
                            } else if (b) {
                                xhr.responseText = b.innerHTML;
                            }
                        }
                    } else if (s.dataType == "xml" && !xhr.responseXML && xhr.responseText != null) {
                        xhr.responseXML = toXml(xhr.responseText);
                    }
                    try {
                        data = httpData(xhr, s.dataType, s);
                    } catch (e) {
                        status = "parsererror";
                        xhr.error = errMsg = e || status;
                    }
                } catch (e) {
                    log("error caught", e);
                    status = "error";
                    xhr.error = errMsg = e || status;
                }
                if (xhr.aborted) {
                    log("upload aborted");
                    status = null;
                }
                if (xhr.status) {
                    status = xhr.status >= 200 && xhr.status < 300 || xhr.status === 304 ? "success" :"error";
                }
                if (status === "success") {
                    s.success && s.success.call(s.context, data, "success", xhr);
                    g && $.event.trigger("ajaxSuccess", [ xhr, s ]);
                } else if (status) {
                    if (errMsg == undefined) errMsg = xhr.statusText;
                    s.error && s.error.call(s.context, xhr, status, errMsg);
                    g && $.event.trigger("ajaxError", [ xhr, s, errMsg ]);
                }
                g && $.event.trigger("ajaxComplete", [ xhr, s ]);
                if (g && !--$.active) {
                    $.event.trigger("ajaxStop");
                }
                s.complete && s.complete.call(s.context, xhr, status);
                callbackProcessed = true;
                if (s.timeout) clearTimeout(timeoutHandle);
                setTimeout(function() {
                    if (!s.iframeTarget) $io.remove();
                    xhr.responseXML = null;
                }, 100);
            }
            var toXml = $.parseXML || function(s, doc) {
                if (window.ActiveXObject) {
                    doc = new ActiveXObject("Microsoft.XMLDOM");
                    doc.async = "false";
                    doc.loadXML(s);
                } else {
                    doc = new DOMParser().parseFromString(s, "text/xml");
                }
                return doc && doc.documentElement && doc.documentElement.nodeName != "parsererror" ? doc :null;
            };
            var parseJSON = $.parseJSON || function(s) {
                return window["eval"]("(" + s + ")");
            };
            var httpData = function(xhr, type, s) {
                var ct = xhr.getResponseHeader("content-type") || "", xml = type === "xml" || !type && ct.indexOf("xml") >= 0, data = xml ? xhr.responseXML :xhr.responseText;
                if (xml && data.documentElement.nodeName === "parsererror") {
                    $.error && $.error("parsererror");
                }
                if (s && s.dataFilter) {
                    data = s.dataFilter(data, type);
                }
                if (typeof data === "string") {
                    if (type === "json" || !type && ct.indexOf("json") >= 0) {
                        data = parseJSON(data);
                    } else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
                        $.globalEval(data);
                    }
                }
                return data;
            };
        }
    };
    $.fn.ajaxForm = function(options) {
        if (this.length === 0) {
            var o = {
                s:this.selector,
                c:this.context
            };
            if (!$.isReady && o.s) {
                log("DOM not ready, queuing ajaxForm");
                $(function() {
                    $(o.s, o.c).ajaxForm(options);
                });
                return this;
            }
            log("terminating; zero elements found by selector" + ($.isReady ? "" :" (DOM not ready)"));
            return this;
        }
        return this.ajaxFormUnbind().bind("submit.form-plugin", function(e) {
            if (!e.isDefaultPrevented()) {
                e.preventDefault();
                $(this).ajaxSubmit(options);
            }
        }).bind("click.form-plugin", function(e) {
            var target = e.target;
            var $el = $(target);
            if (!$el.is(":submit,input:image")) {
                var t = $el.closest(":submit");
                if (t.length == 0) {
                    return;
                }
                target = t[0];
            }
            var form = this;
            form.clk = target;
            if (target.type == "image") {
                if (e.offsetX != undefined) {
                    form.clk_x = e.offsetX;
                    form.clk_y = e.offsetY;
                } else if (typeof $.fn.offset == "function") {
                    var offset = $el.offset();
                    form.clk_x = e.pageX - offset.left;
                    form.clk_y = e.pageY - offset.top;
                } else {
                    form.clk_x = e.pageX - target.offsetLeft;
                    form.clk_y = e.pageY - target.offsetTop;
                }
            }
            setTimeout(function() {
                form.clk = form.clk_x = form.clk_y = null;
            }, 100);
        });
    };
    $.fn.ajaxFormUnbind = function() {
        return this.unbind("submit.form-plugin click.form-plugin");
    };
    $.fn.formToArray = function(semantic) {
        var a = [];
        if (this.length === 0) {
            return a;
        }
        var form = this[0];
        var els = semantic ? form.getElementsByTagName("*") :form.elements;
        if (!els) {
            return a;
        }
        var i, j, n, v, el, max, jmax;
        for (i = 0, max = els.length; i < max; i++) {
            el = els[i];
            n = el.name;
            if (!n) {
                continue;
            }
            if (semantic && form.clk && el.type == "image") {
                if (!el.disabled && form.clk == el) {
                    a.push({
                        name:n,
                        value:$(el).val()
                    });
                    a.push({
                        name:n + ".x",
                        value:form.clk_x
                    }, {
                        name:n + ".y",
                        value:form.clk_y
                    });
                }
                continue;
            }
            v = $.fieldValue(el, true);
            if (v && v.constructor == Array) {
                for (j = 0, jmax = v.length; j < jmax; j++) {
                    a.push({
                        name:n,
                        value:v[j]
                    });
                }
            } else if (v !== null && typeof v != "undefined") {
                a.push({
                    name:n,
                    value:v
                });
            }
        }
        if (!semantic && form.clk) {
            var $input = $(form.clk), input = $input[0];
            n = input.name;
            if (n && !input.disabled && input.type == "image") {
                a.push({
                    name:n,
                    value:$input.val()
                });
                a.push({
                    name:n + ".x",
                    value:form.clk_x
                }, {
                    name:n + ".y",
                    value:form.clk_y
                });
            }
        }
        return a;
    };
    $.fn.formSerialize = function(semantic) {
        return $.param(this.formToArray(semantic));
    };
    $.fn.fieldSerialize = function(successful) {
        var a = [];
        this.each(function() {
            var n = this.name;
            if (!n) {
                return;
            }
            var v = $.fieldValue(this, successful);
            if (v && v.constructor == Array) {
                for (var i = 0, max = v.length; i < max; i++) {
                    a.push({
                        name:n,
                        value:v[i]
                    });
                }
            } else if (v !== null && typeof v != "undefined") {
                a.push({
                    name:this.name,
                    value:v
                });
            }
        });
        return $.param(a);
    };
    $.fn.fieldValue = function(successful) {
        for (var val = [], i = 0, max = this.length; i < max; i++) {
            var el = this[i];
            var v = $.fieldValue(el, successful);
            if (v === null || typeof v == "undefined" || v.constructor == Array && !v.length) {
                continue;
            }
            v.constructor == Array ? $.merge(val, v) :val.push(v);
        }
        return val;
    };
    $.fieldValue = function(el, successful) {
        var n = el.name, t = el.type, tag = el.tagName.toLowerCase();
        if (successful === undefined) {
            successful = true;
        }
        if (successful && (!n || el.disabled || t == "reset" || t == "button" || (t == "checkbox" || t == "radio") && !el.checked || (t == "submit" || t == "image") && el.form && el.form.clk != el || tag == "select" && el.selectedIndex == -1)) {
            return null;
        }
        if (tag == "select") {
            var index = el.selectedIndex;
            if (index < 0) {
                return null;
            }
            var a = [], ops = el.options;
            var one = t == "select-one";
            var max = one ? index + 1 :ops.length;
            for (var i = one ? index :0; i < max; i++) {
                var op = ops[i];
                if (op.selected) {
                    var v = op.value;
                    if (!v) {
                        v = op.attributes && op.attributes["value"] && !op.attributes["value"].specified ? op.text :op.value;
                    }
                    if (one) {
                        return v;
                    }
                    a.push(v);
                }
            }
            return a;
        }
        return $(el).val();
    };
    $.fn.clearForm = function() {
        return this.each(function() {
            $("input,select,textarea", this).clearFields();
        });
    };
    $.fn.clearFields = $.fn.clearInputs = function() {
        return this.each(function() {
            var t = this.type, tag = this.tagName.toLowerCase();
            if (t == "text" || t == "password" || tag == "textarea") {
                this.value = "";
            } else if (t == "checkbox" || t == "radio") {
                this.checked = false;
            } else if (tag == "select") {
                this.selectedIndex = -1;
            }
        });
    };
    $.fn.resetForm = function() {
        return this.each(function() {
            if (typeof this.reset == "function" || typeof this.reset == "object" && !this.reset.nodeType) {
                this.reset();
            }
        });
    };
    $.fn.enable = function(b) {
        if (b === undefined) {
            b = true;
        }
        return this.each(function() {
            this.disabled = !b;
        });
    };
    $.fn.selected = function(select) {
        if (select === undefined) {
            select = true;
        }
        return this.each(function() {
            var t = this.type;
            if (t == "checkbox" || t == "radio") {
                this.checked = select;
            } else if (this.tagName.toLowerCase() == "option") {
                var $sel = $(this).parent("select");
                if (select && $sel[0] && $sel[0].type == "select-one") {
                    $sel.find("option").selected(false);
                }
                this.selected = select;
            }
        });
    };
    function log() {
        if ($.fn.ajaxSubmit.debug) {
            var msg = "[jquery.form] " + Array.prototype.join.call(arguments, "");
            if (window.console && window.console.log) {
                window.console.log(msg);
            } else if (window.opera && window.opera.postError) {
                window.opera.postError(msg);
            }
        }
    }
})(jQuery);

//formvalidation
(function() {
    $.fn.mkform = function(callback) {
        var hashspan = new Object();
        function validateField(field, temp) {
            var error = false;
            var msg = $(field).attr("msg");
            var val = $(field).val();
            var reg = new RegExp(temp);
            if (!reg.test(val)) {
                $(field).addClass("form_msg");
                $(".form_tip").remove();
                $.dialog.tips(msg, 2);
                return false;
            }
            $(field).removeClass("form_msg");
            $(".form_tip").remove();
            return !error;
        }
        function getCheck(obj) {
            var template = $(obj).attr("reg");
            if (template == undefined) {
                return null;
            }
            return template;
        }
        var formstate123268 = false;
        function validateForm(obj) {
            $(obj).submit(function() {
                if (formstate123268) {
                    return false;
                }
                formstate123268 = true;
                var validationError = false;
                $("input,select,textarea", this).each(function() {
                    var temp = getCheck(this);
                    if (temp != null) {
                        if (!validateField(this, temp)) {
                            validationError = true;
                        }
                    }
                });
                formstate123268 = false;
                if (validationError) {
                    return false;
                }
                if (callback != undefined && typeof callback == "function") {
                    var result = callback();
                    if (typeof result == "boolean") {
                        return result;
                    }
                }
                return true;
            });
            $("select", obj).each(function() {
                var temp = getCheck(this);
                if (temp != null) {
                    var val = temp;
                    $(this).children("option", this).each(function() {
                        if ($(this).attr("value") == val) {
                            $(this).attr("selected", "selected");
                        }
                    });
                    $(this).change(function() {
                        validateField(this, temp);
                    });
                }
            });
            $("optgroup", obj).each(function() {
                var temp = getCheck(this);
                var val = temp;
                $(this).children("option", this).each(function() {
                    if ($(this).val() == val) {
                        $(this).attr("selected", "selected");
                    }
                });
            });
            $("input,textarea", obj).each(function() {
                var temp = getCheck(this);
                if (temp != null) {
                    $(this).blur(function() {
                        validateField(this, temp);
                    });
                }
            });
        }
        this.each(function(i, elem) {
            validateForm(elem);
        });
    };
})(jQuery);

//jquery-powerFloat1.5.1
(function(a) {
    a.fn.powerFloat = function(d) {
        return a(this).each(function() {
            var f = a.extend({}, b, d || {});
            var g = function(i, h) {
                if (c.target && c.target.css("display") !== "none") {
                    c.targetHide();
                }
                c.s = i;
                c.trigger = h;
            }, e;
            switch (f.eventType) {
              case "hover":
                a(this).hover(function() {
                    if (c.timerHold) {
                        c.flagDisplay = true;
                    }
                    var h = parseInt(f.showDelay, 10);
                    g(f, a(this));
                    if (h) {
                        if (e) {
                            clearTimeout(e);
                        }
                        e = setTimeout(function() {
                            c.targetGet.call(c);
                        }, h);
                    } else {
                        c.targetGet();
                    }
                }, function() {
                    if (e) {
                        clearTimeout(e);
                    }
                    if (c.timerHold) {
                        clearTimeout(c.timerHold);
                    }
                    c.flagDisplay = false;
                    c.targetHold();
                });
                if (f.hoverFollow) {
                    a(this).mousemove(function(h) {
                        c.cacheData.left = h.pageX;
                        c.cacheData.top = h.pageY;
                        c.targetGet.call(c);
                        return false;
                    });
                }
                break;

              case "click":
                a(this).click(function(h) {
                    if (c.display && c.trigger && h.target === c.trigger.get(0)) {
                        c.flagDisplay = false;
                        c.displayDetect();
                    } else {
                        g(f, a(this));
                        c.targetGet();
                        if (!a(document).data("mouseupBind")) {
                            a(document).bind("mouseup", function(k) {
                                var i = false;
                                if (c.trigger) {
                                    var j = c.target.attr("id");
                                    if (!j) {
                                        j = "R_" + Math.random();
                                        c.target.attr("id", j);
                                    }
                                    a(k.target).parents().each(function() {
                                        if (a(this).attr("id") === j) {
                                            i = true;
                                        }
                                    });
                                    if (f.eventType === "click" && c.display && k.target != c.trigger.get(0) && !i) {
                                        c.flagDisplay = false;
                                        c.displayDetect();
                                    }
                                }
                                return false;
                            }).data("mouseupBind", true);
                        }
                    }
                });
                break;

              case "focus":
                a(this).focus(function() {
                    var h = a(this);
                    setTimeout(function() {
                        g(f, h);
                        c.targetGet();
                    }, 200);
                }).blur(function() {
                    c.flagDisplay = false;
                    setTimeout(function() {
                        c.displayDetect();
                    }, 190);
                });
                break;

              default:
                g(f, a(this));
                c.targetGet();
                a(document).unbind("mouseup").data("mouseupBind", false);
            }
        });
    };
    var c = {
        targetGet:function() {
            if (!this.trigger) {
                return this;
            }
            var h = this.trigger.attr(this.s.targetAttr), g = this.s.target;
		
            switch (this.s.targetMode) {
              case "common":
                if (g) {
                    var i = typeof g;
                    if (i === "object") {
                        if (g.size()) {
                            c.target = g.eq(0);
                        }
                    } else {
                        if (i === "string") {
                            if (a(g).size()) {
                                c.target = a(g).eq(0);
                            }
                        }
                    }
                } else {
                    if (h && a("#" + h).size()) {
                        c.target = a("#" + h);
                    }
                }
                if (c.target) {
                    c.targetShow();
                } else {
                    return this;
                }
                break;

              case "ajax":
                var d = g || h;
				 var url = this.trigger.attr(this.s.urlAttr);
				
                this.targetProtect = false;
                if (!d) {
                    return;
                }
                if (!c.cacheData[d]) {
                    c.loading();
                }
                var f = new Image();
                f.onload = function() {
                    var m = f.width, q = f.height;
                    var p = a(window).width(), s = a(window).height();
                    var r = m / q, o = p / s;
                    if (r > o) {
                        if (m > p / 2) {
                            m = p / 2;
                            q = m / r;
                        }
                    } else {
                        if (q > s / 2) {
                            q = s / 2;
                            m = q * r;
                        }
                    }
                    var n = '<img class="float_ajax_image" src="' + d + '" width="' + m + '" height = "' + q + '" />';	
					if(typeof(url)!='undefined'){
						  n += '<p style=" text-align: center;"><input value="'+url+'" style="width:90%" id="aidurl"/></p><p style=" margin:10px;"><a href="javascript:" class="btn btn-default btn-sm" onclick="copyUrl(\'aidurl\')">复制链接</a><a href="javascript:" class="btn btn-default btn-sm right"  onclick="downloadpic(\'' + d + '\');return false;" >下载二维码</a></p>';	
						}
                    c.cacheData[d] = true;
                    c.target = a(n);
                    c.targetShow();
                };
                f.onerror = function() {
                    if (/(\.jpg|\.png|\.gif|\.bmp|\.jpeg)$/i.test(d)) {
                        c.target = a('<div class="float_ajax_error">图片加载失败。</div>');
                        c.targetShow();
                    } else {
                        a.ajax({
                            url:d,
                            success:function(m) {
                                if (typeof m === "string") {
                                    c.cacheData[d] = true;
                                    c.target = a('<div class="float_ajax_data">' + m + "</div>");
                                    c.targetShow();
                                }
                            },
                            error:function() {
                                c.target = a('<div class="float_ajax_error">数据没有加载成功。</div>');
                                c.targetShow();
                            }
                        });
                    }
                };
                f.src = d;
                break;

              case "list":
                var k = '<ul class="float_list_ul">', j;
                if (a.isArray(g) && (j = g.length)) {
                    a.each(g, function(n, p) {
                        var o = "", r = "", q, m;
                        if (n === 0) {
                            r = ' class="float_list_li_first"';
                        }
                        if (n === j - 1) {
                            r = ' class="float_list_li_last"';
                        }
                        if (typeof p === "object" && (q = p.text.toString())) {
                            if (m = p.href || "javascript:") {
                                o = '<a href="' + m + '" class="float_list_a">' + q + "</a>";
                            } else {
                                o = q;
                            }
                        } else {
                            if (typeof p === "string" && p) {
                                o = p;
                            }
                        }
                        if (o) {
                            k += "<li" + r + ">" + o + "</li>";
                        }
                    });
                } else {
                    k += '<li class="float_list_null">列表无数据。</li>';
                }
                k += "</ul>";
                c.target = a(k);
                this.targetProtect = false;
                c.targetShow();
                break;

              case "remind":
                var l = g || h;
                this.targetProtect = false;
                if (typeof l === "string") {
                    c.target = a("<span>" + l + "</span>");
                    c.targetShow();
                }
                break;

              default:
                var e = g || h, i = typeof e;
                if (e) {
                    if (i === "string") {
                        if (/<.*>/.test(e)) {
                            c.target = a("<div>" + e + "</div>");
                            this.targetProtect = false;
                        } else {
                            if (a(e).size()) {
                                c.target = a(e).eq(0);
                                this.targetProtect = true;
                            } else {
                                if (a("#" + e).size()) {
                                    c.target = a("#" + e).eq(0);
                                    this.targetProtect = true;
                                } else {
                                    c.target = a("<div>" + e + "</div>");
                                    this.targetProtect = false;
                                }
                            }
                        }
                        c.targetShow();
                    } else {
                        if (i === "object") {
                            if (!a.isArray(e) && e.size()) {
                                c.target = e.eq(0);
                                this.targetProtect = true;
                                c.targetShow();
                            }
                        }
                    }
                }
            }
            return this;
        },
        container:function() {
            var d = this.s.container, e = this.s.targetMode || "mode";
            if (e === "ajax" || e === "remind") {
                this.s.sharpAngle = true;
            } else {
                this.s.sharpAngle = false;
            }
            if (this.s.reverseSharp) {
                this.s.sharpAngle = !this.s.sharpAngle;
            }
            if (e !== "common") {
                if (d === null) {
                    d = "plugin";
                }
                if (d === "plugin") {
                    if (!a("#floatBox_" + e).size()) {
                        a('<div id="floatBox_' + e + '" class="float_' + e + '_box"></div>').appendTo(a("body")).hide();
                    }
                    d = a("#floatBox_" + e);
                }
                if (d && typeof d !== "string" && d.size()) {
                    if (this.targetProtect) {
                        c.target.show().css("position", "static");
                    }
                    c.target = d.empty().append(c.target);
                }
            }
            return this;
        },
        setWidth:function() {
            var d = this.s.width;
            if (d === "auto") {
                if (this.target.get(0).style.width) {
                    this.target.css("width", "auto");
                }
            } else {
                if (d === "inherit") {
                    this.target.width(this.trigger.width());
                } else {
                    this.target.css("width", d);
                }
            }
            return this;
        },
        position:function() {
            if (!this.trigger || !this.target) {
                return this;
            }
            var h, x = 0, k = 0, m = 0, y = 0, s, o, e, E, u, q, f = this.target.data("height"), C = this.target.data("width"), r = a(window).scrollTop(), B = parseInt(this.s.offsets.x, 10) || 0, A = parseInt(this.s.offsets.y, 10) || 0, w = this.cacheData;
            if (!f) {
                f = this.target.outerHeight();
                if (this.s.hoverFollow) {
                    this.target.data("height", f);
                }
            }
            if (!C) {
                C = this.target.outerWidth();
                if (this.s.hoverFollow) {
                    this.target.data("width", C);
                }
            }
            h = this.trigger.offset();
            x = this.trigger.outerHeight();
            k = this.trigger.outerWidth();
            s = h.left;
            o = h.top;
            var l = function() {
                if (s < 0) {
                    s = 0;
                } else {
                    if (s + x > a(window).width()) {
                        s = a(window).width() = x;
                    }
                }
            }, i = function() {
                if (o < 0) {
                    o = 0;
                } else {
                    if (o + x > a(document).height()) {
                        o = a(document).height() - x;
                    }
                }
            };
            if (this.s.hoverFollow && w.left && w.top) {
                if (this.s.hoverFollow === "x") {
                    s = w.left;
                    l();
                } else {
                    if (this.s.hoverFollow === "y") {
                        o = w.top;
                        i();
                    } else {
                        s = w.left;
                        o = w.top;
                        l();
                        i();
                    }
                }
            }
            var g = [ "4-1", "1-4", "5-7", "2-3", "2-1", "6-8", "3-4", "4-3", "8-6", "1-2", "7-5", "3-2" ], v = this.s.position, d = false, j;
            a.each(g, function(F, G) {
                if (G === v) {
                    d = true;
                    return;
                }
            });
            if (!d) {
                v = "4-1";
            }
            var D = function(F) {
                var G = "bottom";
                switch (F) {
                  case "1-4":
                  case "5-7":
                  case "2-3":
                    G = "top";
                    break;

                  case "2-1":
                  case "6-8":
                  case "3-4":
                    G = "right";
                    break;

                  case "1-2":
                  case "8-6":
                  case "4-3":
                    G = "left";
                    break;

                  case "4-1":
                  case "7-5":
                  case "3-2":
                    G = "bottom";
                    break;
                }
                return G;
            };
            var n = function(F) {
                if (F === "5-7" || F === "6-8" || F === "8-6" || F === "7-5") {
                    return true;
                }
                return false;
            };
            var t = function(H) {
                var I = 0, F = 0, G = c.s.sharpAngle && c.corner ? true :false;
                if (H === "right") {
                    F = s + k + C + B;
                    if (G) {
                        F += c.corner.width();
                    }
                    if (F > a(window).width()) {
                        return false;
                    }
                } else {
                    if (H === "bottom") {
                        I = o + x + f + A;
                        if (G) {
                            I += c.corner.height();
                        }
                        if (I > r + a(window).height()) {
                            return false;
                        }
                    } else {
                        if (H === "top") {
                            I = f + A;
                            if (G) {
                                I += c.corner.height();
                            }
                            if (I > o - r) {
                                return false;
                            }
                        } else {
                            if (H === "left") {
                                F = C + B;
                                if (G) {
                                    F += c.corner.width();
                                }
                                if (F > s) {
                                    return false;
                                }
                            }
                        }
                    }
                }
                return true;
            };
            j = D(v);
            if (this.s.sharpAngle) {
                this.createSharp(j);
            }
            if (this.s.edgeAdjust) {
                if (t(j)) {
                    (function() {
                        if (n(v)) {
                            return;
                        }
                        var G = {
                            top:{
                                right:"2-3",
                                left:"1-4"
                            },
                            right:{
                                top:"2-1",
                                bottom:"3-4"
                            },
                            bottom:{
                                right:"3-2",
                                left:"4-1"
                            },
                            left:{
                                top:"1-2",
                                bottom:"4-3"
                            }
                        };
                        var H = G[j], F;
                        if (H) {
                            for (F in H) {
                                if (!t(F)) {
                                    v = H[F];
                                }
                            }
                        }
                    })();
                } else {
                    (function() {
                        if (n(v)) {
                            var G = {
                                "5-7":"7-5",
                                "7-5":"5-7",
                                "6-8":"8-6",
                                "8-6":"6-8"
                            };
                            v = G[v];
                        } else {
                            var H = {
                                top:{
                                    left:"3-2",
                                    right:"4-1"
                                },
                                right:{
                                    bottom:"1-2",
                                    top:"4-3"
                                },
                                bottom:{
                                    left:"2-3",
                                    right:"1-4"
                                },
                                left:{
                                    bottom:"2-1",
                                    top:"3-4"
                                }
                            };
                            var I = H[j], F = [];
                            for (name in I) {
                                F.push(name);
                            }
                            if (t(F[0]) || !t(F[1])) {
                                v = I[F[0]];
                            } else {
                                v = I[F[1]];
                            }
                        }
                    })();
                }
            }
            var z = D(v), p = v.split("-")[0];
            if (this.s.sharpAngle) {
                this.createSharp(z);
                m = this.corner.width(), y = this.corner.height();
            }
            if (this.s.hoverFollow) {
                if (this.s.hoverFollow === "x") {
                    e = s + B;
                    if (p === "1" || p === "8" || p === "4") {
                        e = s - (C - k) / 2 + B;
                    } else {
                        e = s - (C - k) + B;
                    }
                    if (p === "1" || p === "5" || p === "2") {
                        E = o - A - f - y;
                        q = o - y - A - 1;
                    } else {
                        E = o + x + A + y;
                        q = o + x + A + 1;
                    }
                    u = h.left - (m - k) / 2;
                } else {
                    if (this.s.hoverFollow === "y") {
                        if (p === "1" || p === "5" || p === "2") {
                            E = o - (f - x) / 2 + A;
                        } else {
                            E = o - (f - x) + A;
                        }
                        if (p === "1" || p === "8" || p === "4") {
                            e = s - C - B - m;
                            u = s - m - B - 1;
                        } else {
                            e = s + k - B + m;
                            u = s + k + B + 1;
                        }
                        q = h.top - (y - x) / 2;
                    } else {
                        e = s + B;
                        E = o + A;
                    }
                }
            } else {
                switch (z) {
                  case "top":
                    E = o - A - f - y;
                    if (p == "1") {
                        e = s - B;
                    } else {
                        if (p === "5") {
                            e = s - (C - k) / 2 - B;
                        } else {
                            e = s - (C - k) - B;
                        }
                    }
                    q = o - y - A - 1;
                    u = s - (m - k) / 2;
                    break;

                  case "right":
                    e = s + k + B + m;
                    if (p == "2") {
                        E = o + A;
                    } else {
                        if (p === "6") {
                            E = o - (f - x) / 2 + A;
                        } else {
                            E = o - (f - x) + A;
                        }
                    }
                    u = s + k + B + 1;
                    q = o - (y - x) / 2;
                    break;

                  case "bottom":
                    E = o + x + A + y;
                    if (p == "4") {
                        e = s + B;
                    } else {
                        if (p === "7") {
                            e = s - (C - k) / 2 + B;
                        } else {
                            e = s - (C - k) + B;
                        }
                    }
                    q = o + x + A + 1;
                    u = s - (m - k) / 2;
                    break;

                  case "left":
                    e = s - C - B - m;
                    if (p == "2") {
                        E = o - A;
                    } else {
                        if (p === "6") {
                            E = o - (C - k) / 2 - A;
                        } else {
                            E = o - (f - x) - A;
                        }
                    }
                    u = e + m;
                    q = o - (C - m) / 2;
                    break;
                }
            }
            if (y && m && this.corner) {
                this.corner.css({
                    left:u,
                    top:q,
                    zIndex:this.s.zIndex + 1
                });
            }
            this.target.css({
                position:"absolute",
                left:e,
                top:E,
                zIndex:this.s.zIndex
            });
            return this;
        },
        createSharp:function(g) {
            var j, k, f = "", d = "";
            var i = {
                left:"right",
                right:"left",
                bottom:"top",
                top:"bottom"
            }, e = i[g] || "top";
            if (this.target) {
                j = this.target.css("background-color");
                if (parseInt(this.target.css("border-" + e + "-width")) > 0) {
                    k = this.target.css("border-" + e + "-color");
                }
                if (k && k !== "transparent") {
                    f = 'style="color:' + k + ';"';
                } else {
                    f = 'style="display:none;"';
                }
                if (j && j !== "transparent") {
                    d = 'style="color:' + j + ';"';
                } else {
                    d = 'style="display:none;"';
                }
            }
            var h = '<div id="floatCorner_' + g + '" class="float_corner float_corner_' + g + '"><span class="corner corner_1" ' + f + '>◆</span><span class="corner corner_2" ' + d + ">◆</span></div>";
            if (!a("#floatCorner_" + g).size()) {
                a("body").append(a(h));
            }
            this.corner = a("#floatCorner_" + g);
            return this;
        },
        targetHold:function() {
            if (this.s.hoverHold) {
                var d = parseInt(this.s.hideDelay, 10) || 200;
                if (this.target) {
                    this.target.hover(function() {
                        c.flagDisplay = true;
                    }, function() {
                        if (c.timerHold) {
                            clearTimeout(c.timerHold);
                        }
                        c.flagDisplay = false;
                        c.targetHold();
                    });
                }
                c.timerHold = setTimeout(function() {
                    c.displayDetect.call(c);
                }, d);
            } else {
                this.displayDetect();
            }
            return this;
        },
        loading:function() {
            this.target = a('<div class="float_loading"></div>');
            this.targetShow();
            this.target.removeData("width").removeData("height");
            return this;
        },
        displayDetect:function() {
            if (!this.flagDisplay && this.display) {
                this.targetHide();
                this.timerHold = null;
            }
            return this;
        },
        targetShow:function() {
            c.cornerClear();
            this.display = true;
            this.container().setWidth().position();
            this.target.show();
            if (a.isFunction(this.s.showCall)) {
                this.s.showCall.call(this.trigger, this.target);
            }
            return this;
        },
        targetHide:function() {
            this.display = false;
            this.targetClear();
            this.cornerClear();
            if (a.isFunction(this.s.hideCall)) {
                this.s.hideCall.call(this.trigger);
            }
            this.target = null;
            this.trigger = null;
            this.s = {};
            this.targetProtect = false;
            return this;
        },
        targetClear:function() {
            if (this.target) {
                if (this.target.data("width")) {
                    this.target.removeData("width").removeData("height");
                }
                if (this.targetProtect) {
                    this.target.children().hide().appendTo(a("body"));
                }
                this.target.unbind().hide();
            }
        },
        cornerClear:function() {
            if (this.corner) {
                this.corner.remove();
            }
        },
        target:null,
        trigger:null,
        s:{},
        cacheData:{},
        targetProtect:false
    };
    a.powerFloat = {};
    a.powerFloat.hide = function() {
        c.targetHide();
    };
    var b = {
        width:"auto",
        offsets:{
            x:0,
            y:0
        },
        zIndex:999,
        eventType:"hover",
        showDelay:0,
        hideDelay:0,
        hoverHold:true,
        hoverFollow:false,
        targetMode:"common",
        target:null,
        targetAttr:"rel",
		urlAttr:"forhref",
        container:null,
        reverseSharp:false,
        position:"4-1",
        edgeAdjust:true,
        showCall:a.noop,
        hideCall:a.noop
    };
})(jQuery);

//idTabs 2.2
(function() {
    var dep = {
        jQuery:"http://code.jquery.com/jquery-latest.min.js"
    };
    var init = function() {
        (function($) {
            $.fn.idTabs = function() {
                var s = {};
                for (var i = 0; i < arguments.length; ++i) {
                    var a = arguments[i];
                    switch (a.constructor) {
                      case Object:
                        $.extend(s, a);
                        break;

                      case Boolean:
                        s.change = a;
                        break;

                      case Number:
                        s.start = a;
                        break;

                      case Function:
                        s.click = a;
                        break;

                      case String:
                        if (a.charAt(0) == ".") s.selected = a; else if (a.charAt(0) == "!") s.event = a; else s.start = a;
                        break;
                    }
                }
                if (typeof s["return"] == "function") s.change = s["return"];
                return this.each(function() {
                    $.idTabs(this, s);
                });
            };
            $.idTabs = function(tabs, options) {
                var meta = $.metadata ? $(tabs).metadata() :{};
                var s = $.extend({}, $.idTabs.settings, meta, options);
                if (s.selected.charAt(0) == ".") s.selected = s.selected.substr(1);
                if (s.event.charAt(0) == "!") s.event = s.event.substr(1);
                if (s.start == null) s.start = -1;
                var showId = function() {
                    if ($(this).is("." + s.selected)) return s.change;
                    var id = "#" + this.href.split("#")[1];
                    var aList = [];
                    var idList = [];
                    $("a", tabs).each(function() {
                        if (this.href.match(/#/)) {
                            aList.push(this);
                            idList.push("#" + this.href.split("#")[1]);
                        }
                    });
                    if (s.click && !s.click.apply(this, [ id, idList, tabs, s ])) return s.change;
                    for (i in aList) $(aList[i]).removeClass(s.selected);
                    for (i in idList) $(idList[i]).hide();
                    $(this).addClass(s.selected);
                    $(id).show();
                    return s.change;
                };
                var list = $("a[href*='#']", tabs).unbind(s.event, showId).bind(s.event, showId);
                list.each(function() {
                    $("#" + this.href.split("#")[1]).hide();
                });
                var test = false;
                if ((test = list.filter("." + s.selected)).length) ; else if (typeof s.start == "number" && (test = list.eq(s.start)).length) ; else if (typeof s.start == "string" && (test = list.filter("[href*='#" + s.start + "']")).length) ;
                if (test) {
                    test.removeClass(s.selected);
                    test.trigger(s.event);
                }
                return s;
            };
            $.idTabs.settings = {
                start:0,
                change:false,
                click:null,
                selected:".selected",
                event:"!click"
            };
            $.idTabs.version = "2.2";
            $(function() {
                $(".idTabs").idTabs();
            });
        })(jQuery);
    };
    var check = function(o, s) {
        s = s.split(".");
        while (o && s.length) o = o[s.shift()];
        return o;
    };
    var head = document.getElementsByTagName("head")[0];
    var add = function(url) {
        var s = document.createElement("script");
        s.type = "text/javascript";
        s.src = url;
        head.appendChild(s);
    };
    var s = document.getElementsByTagName("script");
    var src = s[s.length - 1].src;
    var ok = true;
    for (d in dep) {
        if (check(this, d)) continue;
        ok = false;
        add(dep[d]);
    }
    if (ok) return init();
    add(src);
})();

//lhgcalendar3.0.0
eval(function(p, a, c, k, e, r) {
    e = function(c) {
        return (c < a ? "" :e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) :c.toString(36));
    };
    if (!"".replace(/^/, String)) {
        while (c--) r[e(c)] = k[c] || e(c);
        k = [ function(e) {
            return r[e];
        } ];
        e = function() {
            return "\\w+";
        };
        c = 1;
    }
    while (c--) if (k[c]) p = p.replace(new RegExp("\\b" + e(c) + "\\b", "g"), k[c]);
    return p;
}('(F(a,b,c){F p(a){B b=a.3o||a.3p;C b>=48&&b<=57||b>=37&&b<=40||b==8||b==46}F q(a){B b=J,c={"M+":b.1m()+1,"d+":b.1d(),"h+":b.1y()%12==0?12:b.1y()%12,"H+":b.1y(),"m+":b.25(),"s+":b.26(),"q+":3q.3r((b.1m()+3)/3),w:"3s".N(b.2G()),S:b.3t()};/(y+)/.1j(a)&&(a=a.G(1n.$1,(b.1z()+"").27(4-1n.$1.X)));R(B d 2H c)(K 1n("("+d+")")).1j(a)&&(a=a.G(1n.$1,1n.$1.X==1?c[d]:("3u"+c[d]).27((""+c[d]).X)));C a}F r(b,c){F p(b,c){3v=a.2n(b);I(b==="")C;C c=c.G(/1A/,2I).G(/2J/,2K).G(/1B/,2L).G(/M/,2M).G(/1C/,2N).G(/d/,2O).G(/2o/,2P).G(/H/,2Q).G(/2p/,2R).G(/m/,2S).G(/2q/,2T).G(/s/,2U),c=K 1n("^"+c+"$"),d=c,c.1j(b)}F q(a){B b=[],c=0,d;1o=a.N("1A"),1o<0&&(1o=a.N("2J")),1o>=0&&(b[c]=1o,c++),1p=a.N("1B"),1p<0&&(1p=a.N("M")),1p>=0&&(b[c]=1p,c++),1q=a.N("1C"),1q<0&&(1q=a.N("d")),1q>=0&&(b[c]=1q,c++),1r=a.N("2o"),1r<0&&(1r=a.N("H")),1r>=0&&(b[c]=1r,c++),1s=a.N("2p"),1s<0&&(1s=a.N("m")),1s>=0&&(b[c]=1s,c++),1t=a.N("2q"),1t<0&&(1t=a.N("s")),1t>=0&&(b[c]=1t,c++),d=[1o,1p,1q,1r,1s,1t];R(c=0;c<b.X-1;c++)R(j=0;j<b.X-1-c;j++)I(b[j]>b[j+1]){B e=b[j];b[j]=b[j+1],b[j+1]=e}R(c=0;c<b.X;c++)R(j=0;j<d.X;j++)b[c]==d[j]&&(d[j]=c);C d}B d,e=K O;2I="([0-9]{4})",2K="([0-9]{2})",1o=-1,2L="(0[1-9]|1[0-2])",2M="([1-9]|1[0-2])",1p=-1,2N="(0[1-9]|[1-2][0-9]|30|31)",2O="([1-9]|[1-2][0-9]|30|31)",1q=-1,2P="([0-1][0-9]|20|21|22|23)",2Q="([0-9]|1[0-9]|20|21|22|23)",1r=-1,2R="([0-5][0-9])",2S="([0-9]|[1-5][0-9])",1s=-1,2T="([0-5][0-9])",2U="([0-9]|[1-5][0-9])",1t=-1;I(p(b,c)){B f=d.3w(b),g,h=q(c),i=h[0]>=0?f[h[0]+1]:e.1z(),k=h[1]>=0?f[h[1]+1]-1:e.1m(),l=h[2]>=0?f[h[2]+1]:e.1d(),m=h[3]>=0?f[h[3]+1]:e.1y(),n=h[4]>=0?f[h[4]+1]:e.25(),o=h[5]>=0?f[h[5]+1]:e.26(),g=K O(i,k,l,m,n,o);C g.1d()==l?g:e}C e}F s(b,c,d){B e=K O;C/%/.1j(b)?(d=d||0,b=b.G(/%y/,e.1z()).G(/%M/,e.1m()+1).G(/%d/,e.1d()+d).G(/%H/,e.1y()).G(/%m/,e.25()).G(/%s/,e.26()).G(f,"0$1")):/^#[\\w-]+$/.1j(b)&&(b=a.2n(a(b)[0].L),b.X>0&&c&&(b=q.1D(r(b,c),"1A-1B-1C"))),b}B d=b.3x,e,f=/\\b(\\w)\\b/g,g=!!b.3y,h=g&&!b.3z,i=a(b),k="3A"+(K O).3B(),l=F(a,b){B c=a.X,e;R(;b<c;b++){e=d.3C?a[b].2r:a[b].3D("2r",4);I(e.27(e.2V("/")).N("2s")!==-1)2W}C e.27(0,e.2V("/")+1)}(d.2t("3E"),0),m=h?\'<2X 28="2Y" 3F="3G" 3H="0" 2r="3I:3J" P="2Z:32;z-33:-1;16:29%;1E:34;17:34;3K:3L:3M.3N.3O(3P=0)"></2X>\':"",n=\'<1b E="3Q" 1Q="0" 1R="0" 1S="0"><1F><T><A E="3R"></A><A E="3S"></A><A E="3T"></A></T><T><A E="3U"></A><A><1e E="3V"><1b 16="29%" 1R="0" 1S="0" 1Q="0"><T><A 16="14"><a E="3W" Z="18:19(0);"></a></A><A 16="40"><1G E="3X" 1T="4" L=""/>\\3Y</A><A><a E="3Z" Z="18:19(0);"></a></A><A 16="14"><a E="41" Z="18:19(0);"></a></A><A 16="43"><1G E="44" 1T="4" L=""/>\\45</A><A 16="9"><a E="47" Z="18:19(0);"></a></A></T></1b><1e E="49" P="1c:1H;"><1b 16="29%" 1R="1" 1S="0" 1Q="0"><2a E="4a"><T><A><a E="4b" Z="18:19(0);">\\4c</a></A><A><a E="4d" Z="18:19(0);">\\4e</a></A><A><a E="4f" Z="18:19(0);">\\4g</a></A></T></2a><1F E="4h"></1F></1b></1e></1e><1e E="4i"><1b 1R="1" 1S="0" 1Q="0"><2a><T><A>\\4j</A><A>\\4k</A><A>\\4l</A><A>\\4m</A><A>\\4n</A><A>\\4o</A><A>\\4p</A></T></2a><1F E="4q"></1F></1b></1e><1e E="4r"><1b 16="29%" 1R="0" 1S="0" 1Q="0"><T><A 2u="2v" E="4s"><a E="4t" Z="18:19(0);">\\4u\\4v</a></A><A 2u="2v" E="4w"><1G E="4x" 1T="2"/>:<1G E="4y" 1T="2"/>:<1G E="4z" 1T="2"/></A><A 2u="2v" E="4A"><a E="4B" Z="18:19(0);">\\4C\\4D</a></A></T></1b></1e></A><A E="4E"></A></T><T><A E="4F"></A><A E="4G"></A><A E="4H"></A></T></1F></1b>\'+m;4I{d.4J("4K",!1,!0)}4L(o){}(F(a){B b=d.1I("4M");b.Z=l+"4N/2s.2w",b.4O="4P",a.1k(b)})(d.2t("4Q")[0]);B t=F(a){a=a||{};B b=t.35;R(B d 2H b)a[d]===c&&(a[d]=b[d]);C e?e.2b(a):K t.1U.2b(a)};t.1U=t.36={4R:t,2b:F(b){B c=J,d,g=c.2x(),i,j;C c.1V=b,c.13=d=c.13||c.38(),c.1J=g.4S||g.2c,c.2d=b.28?a(b.28)[0]:c.1J,b.39?d.2y[0].P.1c="":d.2y[0].P.1c="1H",b.1K&&(b.1K=s(b.1K,b.2z,b.2A?1:0)),b.1L&&(b.1L=s(b.1L,b.2z,b.2A?-1:0)),i=a.2n(c.2d.L),i.X>0?j=r(i,b.1M):j=K O,d.2e[0].L=(j.1y()+"").G(f,"0$1"),d.2f[0].L=(j.25()+"").G(f,"0$1"),d.2g[0].L=(j.26()+"").G(f,"0$1"),a("1G",d.2y[0]).4T({4U:b.1M.N("H")>=0?!1:!0}),c.1f(j).3a().3b(c.1J),h&&a("#2Y").2w({3c:d.15[0].2h+"1u"}),e||(d.15[0].P.16=d.15[0].3d+"1u",c.3e(),e=c),c},1f:F(a,b){B c=J,e=c.13,g,h,i,j=[],k,l,m=c.1V,n,o,p,q=0,r;c.U=k=a.1z(),c.V=l=a.1m()+1,c.Q=b||a.1d(),e.1v[0].L=k,e.1g[0].L=l,g=(K O(k,l-1,1)).2G(),h=(K O(k,l-1,0)).1d(),i=(K O(k,l,0)).1d();R(B t=0;t<g;t++)j.2B(h),h--;j.4V();R(B t=1;t<=i;t++)j.2B(t);R(B t=1;t<=42-i-g;t++)j.2B(t);n=d.3f();R(B t=0;t<6;t++){o=d.1I("T");R(B u=0;u<7;u++){p=d.1I("A"),r=(k+"-"+l+"-"+j[q]).G(f,"0$1");I(q<g||q>=i+g||m.1K&&m.1K>r||m.1L&&m.1L<r||m.2C&&m.2C.N(u)>=0)c.1W(p,j[q]);W I(m.1w){R(B v=0,w=m.1w.X;v<w;v++){/%/.1j(m.1w[v])&&(m.1w[v]=s(m.1w[v]));B x=K 1n(m.1w[v]),y=m.3g?!x.1j(r):x.1j(r);I(y)2W}y?c.1W(p,j[q]):c.1W(p,j[q],!0)}W c.1W(p,j[q],!0);o.1k(p),q++}n.1k(o)}2D(e.2i[0].1x)e.2i[0].3h(e.2i[0].1x);C e.2i[0].1k(n),c},1W:F(b,c,d){d?(b.2j=\'<a Z="18:19(0);">\'+c+"</a>",b.1x[k+"D"]=c+"",c===J.Q&&a(b).4W("4X")):b.2j=c+""},1X:F(a,b){B c=J.13,e,f,g=d.3f();R(B h=0;h<4;h++){e=d.1I("T");R(B i=0;i<3;i++)f=d.1I("A"),f.2j=\'<a Z="18:19(0);">\'+(b?b[a]:a)+"</a>",e.1k(f),b?f.1x[k+"M"]=a:f.1x[k+"Y"]=a,a++;g.1k(e)}2D(c.1N[0].1x)c.1N[0].3h(c.1N[0].1x);C c.1N[0].1k(g),J},2E:F(){J.13.1O[0].P.1c="3i"},1P:F(){J.13.1O[0].P.1c="1H"},3b:F(){B b=J,c=b.13,d,e=a(b.1J).2k(),f=e.1E+b.1J.2h,g=i.16(),h=i.3c(),j=i.4Y(),k=i.4Z(),l=c.15[0].3d,m=c.15[0].2h;C f+m>h+k&&(f=e.1E-m-2),e.17+l>g+j&&(e.17-=l),c.15.2w({17:e.17+"1u",1E:f+"1u"}),d=c.1g.2k().1E+c.1g[0].2h,c.1O[0].P.1E=d-f+"1u",b},38:F(){B b=d.1I("1e");b.P.50="2Z:32;1c:1H;z-33:"+J.1V.3j+";",b.2j=n;B c,e=0,f={15:a(b)},g=b.2t("*"),h=g.X;R(;e<h;e++)c=g[e].51.52("53")[1],c&&(f[c]=a(g[e]));C d.54.1k(b),f},2x:F(){I(g)C b.55;B a=J.2x.3k;2D(a!=1a){B c=a.56[0];I(c&&(c+"").N("58")>=0)C c;a=a.3k}C 1a},2F:F(b){b=1h(b,10);B c=J,d=c.1V,e=c.13,f=K O(c.U,c.V-1,b);I(d.1M.N("H")>=0){B g=1h(e.2e[0].L,10),h=1h(e.2f[0].L,10),i=1h(e.2g[0].L,10);f=K O(c.U,c.V-1,b,g,h,i)}c.Q=b,d.1Y&&d.1Y.1D(c),c.2d.L=q.1D(f,d.1M);I(d.1Z){B j=d.1M.N("H")>=0?"1A-1B-1C 2o:2p:2q":"1A-1B-1C";a(d.1Z)[0].L=q.1D(f,j)}c.2l()},3e:F(){B b=J,c=b.13;c.15.1i("2m",F(d){B e=d.2c;I(e[k+"D"])b.2F(e[k+"D"]);W I(e===c.59[0])b.1f(K O(b.U,b.V-2),b.Q);W I(e===c.5a[0])b.1f(K O(b.U,b.V),b.Q);W I(e===c.5b[0])b.1f(K O(b.U-1,b.V-1),b.Q);W I(e===c.5c[0])b.1f(K O(b.U+1,b.V-1),b.Q);W I(e===c.5d[0]){B f=K O;b.U=f.1z(),b.V=f.1m()+1,b.Q=f.1d(),b.2F(b.Q)}W I(e===c.5e[0]){B g=b.1V;g.1Y&&(b.U="",b.V="",b.Q="",g.1Y.1D(b)),b.2d.L="",b.2l(),g.1Z&&(a(g.1Z)[0].L="")}W{I(e===c.1g[0]){B h=["5f","5g","5h","5i","5j","5k","5l","5m","5n","10","11","12"],i=c.1g.2k().17-1h(c.15[0].P.17,10);C c.1g[0].3l(),c.3m[0].P.1c="1H",c.1O[0].P.17=i+"1u",b.1X(0,h).2E(),!1}I(e===c.1v[0]){B i=c.1v.2k().17-1h(c.15[0].P.17,10);C c.1v[0].3l(),c.3m[0].P.1c="",c.1O[0].P.17=i+"1u",b.1X(b.U-4).2E(),!1}B f=K O,j=c.1g[0].L||f.1m()+1,l=c.1v[0].L||f.1z();b.1f(K O(l,j-1),b.Q)}C b.1P(),!1}),c.1O.1i("2m",F(d){B e=d.2c;I(e[k+"M"]>=0)c.1g[0].L=e[k+"M"]+1,b.1f(K O(b.U,e[k+"M"]),b.Q).1P();W I(e[k+"Y"])c.1v[0].L=e[k+"Y"],b.1f(K O(e[k+"Y"],b.V-1),b.Q).1P();W I(e===c.5o[0]){B f=a("a",c.1N[0])[0][k+"Y"];b.1X(f-12)}W I(e===c.5p[0]){B f=a("a",c.1N[0])[0][k+"Y"];b.1X(f+12)}W e===c.5q[0]&&b.1P();C!1}),c.1g.1i("24",p),c.1v.1i("24",p),c.2e.1i("24",p),c.2f.1i("24",p),c.2g.1i("24",p),a(d).1i("2m",F(a){a.2c!==b.1J&&b.2l().1P()})},3a:F(){C J.13.15[0].P.1c="3i",J},2l:F(){C J.13.15[0].P.1c="1H",J},1d:F(a){B b=J,c=b.13,d=1h(c.2e[0].L,10),e=1h(c.2f[0].L,10),f=1h(c.2g[0].L,10);I(b.U===""&&b.V===""&&b.Q==="")C"";5r(a){1l"y":C b.U;1l"M":C b.V;1l"d":C b.Q;1l"H":C d;1l"m":C e;1l"s":C f;1l"5s":C b.U+"-"+b.V+"-"+b.Q;1l"5t":C b.U+"-"+b.V+"-"+b.Q+" "+d+":"+e+":"+f}}},t.1U.2b.36=t.1U,t.5u=F(a,b){C q.1D(a,b)},t.35={28:1a,1M:"1A-1B-1C",1K:1a,1L:1a,39:!0,2z:1a,2C:1a,1Y:1a,1Z:1a,1w:1a,3g:!1,3j:5v,2A:!1,5w:1a},a.1U.3n=F(a,b){C b=b||"2m",J.1i(b,F(){C t(a),!1}),J},b.2s=a.3n=t})(J.5x||J.5y,J)', 62, 345, "||||||||||||||||||||||||||||||||||||td|var|return||class|function|replace||if|this|new|value||indexOf|Date|style|day|for||tr|year|month|else|length||href||||DOM||wrap|width|left|javascript|void|null|table|display|getDate|div|_draw|im|parseInt|bind|test|appendChild|case|getMonth|RegExp|yi|Mi|di|Hi|mi|si|px|iy|disDate|firstChild|getHours|getFullYear|yyyy|MM|dd|call|top|tbody|input|none|createElement|evObj|minDate|maxDate|format|lbox|ymlist|_hideList|border|cellspacing|cellpadding|maxlength|fn|config|_setCell|_drawList|onSetDate|real|||||keypress|getMinutes|getSeconds|substr|id|100|thead|_init|target|inpE|hour|minute|second|offsetHeight|db|innerHTML|offset|hide|click|trim|HH|mm|ss|src|lhgcalendar|getElementsByTagName|align|center|css|_getEvent|foot|targetFormat|noToday|push|disWeek|while|_showList|_setDate|getDay|in|y4|yy|y2|M2|M1|d2|d1|H2|H1|m2|m1|s2|s1|lastIndexOf|break|iframe|lhgcal_frm|position|||absolute|index|0px|setting|prototype||_getDOM|btnBar|show|_offset|height|offsetWidth|_addEvent|createDocumentFragment|enDate|removeChild|block|zIndex|caller|select|ybar|calendar|keyCode|charCode|Math|floor|0123456|getMilliseconds|00|sting|exec|document|ActiveXObject|XMLHttpRequest|JCA|getTime|querySelector|getAttribute|script|hideFocus|true|frameborder|about|blank|filter|progid|DXImageTransform|Microsoft|Alpha|opacity|lcui_border|lcui_lt|lcui_t|lcui_rt|lcui_l|lcui_head|cui_pm|cui_im|u6708|cui_nm||cui_py||60|cui_iy|u5e74||cui_ny||cui_ymlist|cui_ybar|cui_pybar|u00ab|cui_cybar|u00d7|cui_nybar|u00bb|cui_lbox|lcui_body|u65e5|u4e00|u4e8c|u4e09|u56db|u4e94|u516d|cui_db|cui_foot|lcui_today|cui_tbtn|u4eca|u5929|lcui_time|cui_hour|cui_minute|cui_second|lcui_empty|cui_dbtn|u6e05|u7a7a|lcui_r|lcui_lb|lcui_b|lcui_rb|try|execCommand|BackgroundImageCache|catch|link|skins|rel|stylesheet|head|constructor|srcElement|attr|disabled|reverse|addClass|cui_today|scrollLeft|scrollTop|cssText|className|split|cui_|body|event|arguments||Event|pm|nm|py|ny|tbtn|dbtn|01|02|03|04|05|06|07|08|09|pybar|nybar|cybar|switch|date|dateTime|formatDate|1978|linkageObj|jQuery|lhgcore".split("|"), 0, {}));

//soColorPacker 1.0 
(function(a) {
    a.fn.extend({
        soColorPacker:function(c) {
            c = a.extend({
                changeTarget:null,
                textChange:true,
                colorChange:1,
                selfBgChange:false,
                size:2,
                x:0,
                y:20,
                styleClass:null,
                callback:function() {}
            }, c || {});
            function b() {
                var d = a('<div class="colorPackerBox"></div>');
                var g = [ "FF", "CC", "99", "66", "33", "00" ];
                var l = [], m = "";
                for (var h = 0; h < 6; h++) {
                    m += '<div class="div_cellBox">';
                    for (var f = 0; f < 6; f++) {
                        for (var e = 0; e < 6; e++) {
                            var n = g[h] + g[f] + g[e];
                            m += '<span class="span_colorCell" style="background-color:#' + n + '" rel="#' + n + '"></span>';
                        }
                    }
                    m += "</div>";
                }
                m += '<div class="overShowbox"><span class="span_overBg"></span><span class="span_overValue"></span><span class="span_close">关闭</span></div>';
                d.append(m);
                return d;
            }
            return this.each(function() {
                var d;
                a.data(a(this).get(0), "colorPackSa", {
                    hasColorPacker:false
                });
                a(this).click(function(h) {
                    var j = a(h.target);
                    if (false == a.data(j.get(0), "colorPackSa").hasColorPacker) {
                        a.data(j.get(0), "colorPackSa", {
                            hasColorPacker:true
                        });
                        d = b();
                        a("body").append(d);
                        if (a.fn.bgIframe) {
                            a(d).bgiframe();
                        }
                        if (c.styleClass) {
                            a(d).addClass(c.styleClass);
                        }
                        if (c.size == 1) {
                            a(d).width(162);
                            a(".div_cellBox", d).width(54);
                            a(".span_colorCell", d).css({
                                width:"8px",
                                height:"8px"
                            });
                        }
                        if (c.size == 3) {
                            a(d).width(270);
                            a(".div_cellBox", d).width(90);
                            a(".span_colorCell", d).css({
                                width:"14px",
                                height:"14px"
                            });
                        }
                        var g = j.findPosition();
                        var f = (parseInt(c.x) ? parseInt(c.x) :0) + g[0];
                        var k = (parseInt(c.y) ? parseInt(c.y) :0) + g[1];
                        a(d).css({
                            position:"absolute",
                            left:f,
                            top:k
                        });
                        var e;
                        e = c.changeTarget ? a(c.changeTarget) :j;
                        if (e.val().indexOf("#") == 0) {
                            var i = e.val();
                            a(".span_overBg", d).css("backgroundColor", i);
                            a(".span_overValue", d).text(i);
                        }
                        a(".span_colorCell", d).bind("click", function() {
                            var l = a(this).attr("rel");
                            if (c.colorChange == 1) {
                                e.css("color", l);
                            }
                            if (c.colorChange == 2) {
                                e.css("backgroundColor", l);
                            }
                            if (c.selfBgChange) {
                                j.css("backgroundColor", l);
                            }
                            if (c.textChange) {
                                if (e.is("input") && "text" == e.attr("type")) {
                                    e.val(l);
                                } else {
                                    e.text(l);
                                }
                            }
                            c.callback({
                                color:l
                            });
                            l = null;
                            d.remove();
                            d = null;
                            a.data(j.get(0), "colorPackSa", {
                                hasColorPacker:false
                            });
                        }).bind("mouseover", function() {
                            var l = a(this).attr("rel");
                            a(".span_overBg", d).css("backgroundColor", l);
                            a(".span_overValue", d).text(l);
                            l = null;
                        });
                        a(".span_close", d).bind("click", function() {
                            d.remove();
                            d = null;
                            a.data(j.get(0), "colorPackSa", {
                                hasColorPacker:false
                            });
                        });
                    }
                });
            });
        },
        findPosition:function() {
            var b = a(this).get(0);
            var c = curtop = 0;
            if (b.offsetParent) {
                do {
                    c += b.offsetLeft;
                    curtop += b.offsetTop;
                } while (b = b.offsetParent);
                return [ c, curtop ];
            } else {
                return false;
            }
        }
    });
})(jQuery);

//Tags Input Plugin
(function(a) {
    var b = new Array();
    var c = new Array();
    a.fn.doAutosize = function(b) {
        var c = a(this).data("minwidth"), d = a(this).data("maxwidth"), e = "", f = a(this), g = a("#" + a(this).data("tester_id"));
        if (e === (e = f.val())) {
            return;
        }
        var h = e.replace(/&/g, "&").replace(/\s/g, " ").replace(/</g, "<").replace(/>/g, ">");
        g.html(h);
        var i = g.width(), j = i + b.comfortZone >= c ? i + b.comfortZone :c, k = f.width(), l = j < k && j >= c || j > c && j < d;
        if (l) {
            f.width(j);
        }
    };
    a.fn.resetAutosize = function(b) {
        var c = a(this).data("minwidth") || b.minInputWidth || a(this).width(), d = a(this).data("maxwidth") || b.maxInputWidth || a(this).closest(".tagsinput").width() - b.inputPadding, e = "", f = a(this), g = a("<tester/>").css({
            position:"absolute",
            top:-9999,
            left:-9999,
            width:"auto",
            fontSize:f.css("fontSize"),
            fontFamily:f.css("fontFamily"),
            fontWeight:f.css("fontWeight"),
            letterSpacing:f.css("letterSpacing"),
            whiteSpace:"nowrap"
        }), h = a(this).attr("id") + "_autosize_tester";
        if (!a("#" + h).length > 0) {
            g.attr("id", h);
            g.appendTo("body");
        }
        f.data("minwidth", c);
        f.data("maxwidth", d);
        f.data("tester_id", h);
        f.css("width", c);
    };
    a.fn.addTag = function(d, e) {
        e = jQuery.extend({
            focus:false,
            callback:true
        }, e);
        this.each(function() {
            var f = a(this).attr("id");
            var g = a(this).val().split(b[f]);
            if (g[0] == "") {
                g = new Array();
            }
            d = jQuery.trim(d);
            if (e.unique) {
                var h = a(g).tagExist(d);
                if (h == true) {
                    a("#" + f + "_tag").addClass("not_valid");
                }
            } else {
                var h = false;
            }
            if (d != "" && h != true) {
                a("<span>").addClass("tag").append(a("<span>").text(d).append("  "), a("<a>", {
                    href:"#",
                    title:"Removing tag",
                    text:"x"
                }).click(function() {
                    return a("#" + f).removeTag(escape(d));
                })).insertBefore("#" + f + "_addTag");
                g.push(d);
                a("#" + f + "_tag").val("");
                if (e.focus) {
                    a("#" + f + "_tag").focus();
                } else {
                    a("#" + f + "_tag").blur();
                }
                a.fn.tagsInput.updateTagsField(this, g);
                if (e.callback && c[f] && c[f]["onAddTag"]) {
                    var i = c[f]["onAddTag"];
                    i.call(this, d);
                }
                if (c[f] && c[f]["onChange"]) {
                    var j = g.length;
                    var i = c[f]["onChange"];
                    i.call(this, a(this), g[j - 1]);
                }
            }
        });
        return false;
    };
    a.fn.removeTag = function(d) {
        d = unescape(d);
        this.each(function() {
            var e = a(this).attr("id");
            var f = a(this).val().split(b[e]);
            a("#" + e + "_tagsinput .tag").remove();
            str = "";
            for (i = 0; i < f.length; i++) {
                if (f[i] != d) {
                    str = str + b[e] + f[i];
                }
            }
            a.fn.tagsInput.importTags(this, str);
            if (c[e] && c[e]["onRemoveTag"]) {
                var g = c[e]["onRemoveTag"];
                g.call(this, d);
            }
        });
        return false;
    };
    a.fn.tagExist = function(b) {
        return jQuery.inArray(b, a(this)) >= 0;
    };
    a.fn.importTags = function(b) {
        id = a(this).attr("id");
        a("#" + id + "_tagsinput .tag").remove();
        a.fn.tagsInput.importTags(this, b);
    };
    a.fn.tagsInput = function(d) {
        var e = jQuery.extend({
            interactive:true,
            defaultText:"add a tag",
            minChars:0,
            width:"300px",
            height:"100px",
            autocomplete:{
                selectFirst:false
            },
            hide:true,
            delimiter:",",
            unique:true,
            removeWithBackspace:true,
            placeholderColor:"#666666",
            autosize:true,
            comfortZone:20,
            inputPadding:6 * 2
        }, d);
        this.each(function() {
            if (e.hide) {
                a(this).hide();
            }
            var d = a(this).attr("id");
            if (!d || b[a(this).attr("id")]) {
                d = a(this).attr("id", "tags" + new Date().getTime()).attr("id");
            }
            var f = jQuery.extend({
                pid:d,
                real_input:"#" + d,
                holder:"#" + d + "_tagsinput",
                input_wrapper:"#" + d + "_addTag",
                fake_input:"#" + d + "_tag"
            }, e);
            b[d] = f.delimiter;
            if (e.onAddTag || e.onRemoveTag || e.onChange) {
                c[d] = new Array();
                c[d]["onAddTag"] = e.onAddTag;
                c[d]["onRemoveTag"] = e.onRemoveTag;
                c[d]["onChange"] = e.onChange;
            }
            var g = '<div id="' + d + '_tagsinput" class="tagsinput"><div id="' + d + '_addTag">';
            if (e.interactive) {
                g = g + '<input id="' + d + '_tag" value="" data-default="' + e.defaultText + '" />';
            }
            g = g + '</div><div class="tags_clear"></div></div>';
            a(g).insertAfter(this);
            a(f.holder).css("width", e.width);
            a(f.holder).css("height", e.height);
            if (a(f.real_input).val() != "") {
                a.fn.tagsInput.importTags(a(f.real_input), a(f.real_input).val());
            }
            if (e.interactive) {
                a(f.fake_input).val(a(f.fake_input).attr("data-default"));
                a(f.fake_input).css("color", e.placeholderColor);
                a(f.fake_input).resetAutosize(e);
                a(f.holder).bind("click", f, function(b) {
                    a(b.data.fake_input).focus();
                });
                a(f.fake_input).bind("focus", f, function(b) {
                    if (a(b.data.fake_input).val() == a(b.data.fake_input).attr("data-default")) {
                        a(b.data.fake_input).val("");
                    }
                    a(b.data.fake_input).css("color", "#000000");
                });
                if (e.autocomplete_url != undefined) {
                    autocomplete_options = {
                        source:e.autocomplete_url
                    };
                    for (attrname in e.autocomplete) {
                        autocomplete_options[attrname] = e.autocomplete[attrname];
                    }
                    if (jQuery.Autocompleter !== undefined) {
                        a(f.fake_input).autocomplete(e.autocomplete_url, e.autocomplete);
                        a(f.fake_input).bind("result", f, function(b, c, f) {
                            if (c) {
                                a("#" + d).addTag(c[0] + "", {
                                    focus:true,
                                    unique:e.unique
                                });
                            }
                        });
                    } else if (jQuery.ui.autocomplete !== undefined) {
                        a(f.fake_input).autocomplete(autocomplete_options);
                        a(f.fake_input).bind("autocompleteselect", f, function(b, c) {
                            a(b.data.real_input).addTag(c.item.value, {
                                focus:true,
                                unique:e.unique
                            });
                            return false;
                        });
                    }
                } else {
                    a(f.fake_input).bind("blur", f, function(b) {
                        var c = a(this).attr("data-default");
                        if (a(b.data.fake_input).val() != "" && a(b.data.fake_input).val() != c) {
                            if (b.data.minChars <= a(b.data.fake_input).val().length && (!b.data.maxChars || b.data.maxChars >= a(b.data.fake_input).val().length)) a(b.data.real_input).addTag(a(b.data.fake_input).val(), {
                                focus:true,
                                unique:e.unique
                            });
                        } else {
                            a(b.data.fake_input).val(a(b.data.fake_input).attr("data-default"));
                            a(b.data.fake_input).css("color", e.placeholderColor);
                        }
                        return false;
                    });
                }
                a(f.fake_input).bind("keypress", f, function(b) {
                    if (b.which == b.data.delimiter.charCodeAt(0) || b.which == 13) {
                        b.preventDefault();
                        if (b.data.minChars <= a(b.data.fake_input).val().length && (!b.data.maxChars || b.data.maxChars >= a(b.data.fake_input).val().length)) a(b.data.real_input).addTag(a(b.data.fake_input).val(), {
                            focus:true,
                            unique:e.unique
                        });
                        a(b.data.fake_input).resetAutosize(e);
                        return false;
                    } else if (b.data.autosize) {
                        a(b.data.fake_input).doAutosize(e);
                    }
                });
                f.removeWithBackspace && a(f.fake_input).bind("keydown", function(b) {
                    if (b.keyCode == 8 && a(this).val() == "") {
                        b.preventDefault();
                        var c = a(this).closest(".tagsinput").find(".tag:last").text();
                        var d = a(this).attr("id").replace(/_tag$/, "");
                        c = c.replace(/[\s]+x$/, "");
                        a("#" + d).removeTag(escape(c));
                        a(this).trigger("focus");
                    }
                });
                a(f.fake_input).blur();
                if (f.unique) {
                    a(f.fake_input).keydown(function(b) {
                        if (b.keyCode == 8 || String.fromCharCode(b.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,\/]+/)) {
                            a(this).removeClass("not_valid");
                        }
                    });
                }
            }
        });
        return this;
    };
    a.fn.tagsInput.updateTagsField = function(c, d) {
        var e = a(c).attr("id");
        a(c).val(d.join(b[e]));
    };
    a.fn.tagsInput.importTags = function(d, e) {
        a(d).val("");
        var f = a(d).attr("id");
        var g = e.split(b[f]);
        for (i = 0; i < g.length; i++) {
            a(d).addTag(g[i], {
                focus:false,
                callback:false
            });
        }
        if (c[f] && c[f]["onChange"]) {
            var h = c[f]["onChange"];
            h.call(d, d, g[i]);
        }
    };
})(jQuery);

function copyUrl(id)
 {
  var Url2=document.getElementById(id);
  Url2.select(); // 选择对象
  document.execCommand("Copy"); // 执行浏览器复制命令
  alert("已复制好，可贴粘。");
  }
  
       