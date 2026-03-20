(function () {
    const modal = document.getElementById('regModal');
    const closeBtn = document.querySelector('.close-modal');
    const leadForm = document.getElementById('mdbLeadForm');
    const leadSuccessMessage = document.getElementById('leadSuccessMessage');

    const SESSION_KEY = 'sms_lead_modal_shown_v1';
    const AUTO_OPEN_MS = 10000;

    const hasShownModalThisSession = () => {
        try {
            return window.sessionStorage.getItem(SESSION_KEY) === '1';
        } catch {
            return false;
        }
    };

    const markModalAsShown = () => {
        try {
            window.sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
            // Ignore storage failures (e.g., privacy mode).
        }
    };

    const openModal = ({ checkSessionShown = false } = {}) => {
        if (!modal) return;
        if (checkSessionShown && hasShownModalThisSession()) return;

        if (checkSessionShown) markModalAsShown();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');

        const stickyBar = document.querySelector('.mobile-sticky-bar');
        if (stickyBar) stickyBar.style.display = 'none';

        // Small UX touch: focus the first field.
        const firstField = leadForm ? leadForm.querySelector('input, select, button') : null;
        if (firstField) setTimeout(() => firstField.focus(), 50);
    };

    // --- TRACKING PARAMS ---
    const urlParams = new URLSearchParams(window.location.search);
    const trackingParams = {
        utm_source:   urlParams.get('utm_source')   || '',
        utm_medium:   urlParams.get('utm_medium')   || '',
        utm_campaign: urlParams.get('utm_campaign') || '',
        utm_content:  urlParams.get('utm_content')  || '',
        gclid:        urlParams.get('gclid')        || '',
        fbclid:       urlParams.get('fbclid')       || '',
        affiliate:    urlParams.get('affiliate')    || ''
    };

    const cleanParam = (val) => (val && val.trim() !== "") ? val : "not_set";

    // --- CLICK DELEGATION ---
    document.addEventListener('click', function (e) {
        // CTA Button → open modal
        const cta = e.target.closest('.cta-btn');
        if (cta) {
            const ctaText = (cta.getAttribute('aria-label') || cta.textContent || '').trim();
            // Only open the lead form for "Apply Now" CTAs (there are many across the page).
            if (!/apply\s*now/i.test(ctaText)) return;
            e.preventDefault();
            openModal({ checkSessionShown: false });
            return;
        }

        // Video Facade → load iframe
        const facade = e.target.closest('.video-facade');
        if (facade) {
            const id = facade.getAttribute('data-id');
            const iframe = document.createElement('iframe');
            iframe.setAttribute('src', `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`);
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen', '1');
            facade.innerHTML = '';
            facade.appendChild(iframe);
            return;
        }
    });

    // --- MODAL CLOSE ---
    const closeModal = () => {
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        const stickyBar = document.querySelector('.mobile-sticky-bar');
        if (stickyBar) stickyBar.style.display = '';
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modal) closeModal(); };

    // --- AUTO POPUP (once per session) ---
    setTimeout(() => {
        openModal({ checkSessionShown: false });
    }, AUTO_OPEN_MS);

    // --- FORM SUBMIT (with dual webhook) ---
    if (leadForm) {
        const WEBHOOK_URL        = "https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjcwNTZjMDYzNzA0MzE1MjZlNTUzNzUxMzAi_pc";
        const BACKUP_WEBHOOK_URL = "https://n8n.srv882352.hstgr.cloud/webhook/bda6fe45-e768-48ac-8ead-b27271650ad9";
        const THANK_YOU_MESSAGE  = "Thank you! Your brochure will be sent shortly.";

        const setFieldError = (fieldKey, message) => {
            const el = leadForm.querySelector(`.field-error[data-error-for="${fieldKey}"]`);
            if (!el) return;
            el.textContent = message;
            el.style.display = 'block';
        };

        const clearFieldErrors = () => {
            leadForm.querySelectorAll('.field-error').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
        };

        const simulateBrochureDownload = () => {
            // No real brochure file exists in repo; simulate a download via generated text.
            try {
                const blob = new Blob(
                    ['Brochure request received.\nWe will contact you shortly with details.'],
                    { type: 'text/plain;charset=utf-8' }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'SMS_Varanasi_Brochure_Request.txt';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 800);
            } catch (err) {
                // Simulation only; ignore failures.
                console.warn('Download simulation failed:', err);
            }
        };

        leadForm.onsubmit = async function (e) {
            e.preventDefault();

            const nameEl = leadForm.querySelector('input[name="full_name"]');
            const phoneEl = leadForm.querySelector('input[name="phone"]');
            const courseEl = leadForm.querySelector('select[name="course"]');
            const cityEl = leadForm.querySelector('input[name="city"]');
            const emailEl = leadForm.querySelector('input[name="email"]');

            const submitBtn = leadForm.querySelector('button[type="submit"]');
            const safeSetDisabled = (state) => {
                if (!submitBtn) return;
                submitBtn.disabled = state;
            };

            clearFieldErrors();
            if (leadSuccessMessage) leadSuccessMessage.hidden = true;

            const fullName = (nameEl?.value || '').trim();
            const phoneStr = String(phoneEl?.value ?? '').trim();
            const courseVal = (courseEl?.value || '').trim();
            const cityVal = (cityEl?.value || '').trim();
            const emailVal = (emailEl?.value || '').trim();

            let isValid = true;

            if (!fullName || fullName.length < 2) {
                isValid = false;
                setFieldError('full_name', 'Please enter your name.');
            }

            // Phone number validation for <input type="number">.
            // Expect exactly 10 digits.
            if (!/^\d{10}$/.test(phoneStr)) {
                isValid = false;
                setFieldError('phone', 'Please enter a valid 10-digit phone number.');
            }

            if (!courseVal) {
                isValid = false;
                setFieldError('course', 'Please select a course.');
            }

            if (!cityVal || cityVal.length < 2) {
                isValid = false;
                setFieldError('city', 'Please enter your city.');
            }

            if (!emailVal || !emailEl?.checkValidity()) {
                isValid = false;
                setFieldError('email', 'Please enter a valid email address.');
            }

            if (!isValid) return;

            if (submitBtn) submitBtn.innerText = 'Sending...';
            safeSetDisabled(true);

            const payload = {
                name: cleanParam(fullName),
                email: cleanParam(emailVal),
                phone: cleanParam(phoneStr),
                program: cleanParam(courseVal),
                city: cleanParam(cityVal),
                utm_source: cleanParam(trackingParams.utm_source),
                utm_medium: cleanParam(trackingParams.utm_medium),
                utm_campaign: cleanParam(trackingParams.utm_campaign),
                utm_content: cleanParam(trackingParams.utm_content),
                gclid: cleanParam(trackingParams.gclid),
                fbclid: cleanParam(trackingParams.fbclid),
                affiliate: cleanParam(trackingParams.affiliate),
                page_url: window.location.href,
                timestamp: new Date().toISOString()
            };

            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            };

            const postWithTimeout = async (url, options, timeoutMs = 8000) => {
                if (!url) return false;
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const res = await fetch(url, { ...options, signal: controller.signal });
                    clearTimeout(timer);
                    return !!res && (res.ok || res.status === 0); // status 0 for opaque/no-cors responses
                } catch (err) {
                    clearTimeout(timer);
                    console.warn('Webhook request failed:', err);
                    return false;
                }
            };

            try {
                const [primaryOk, backupOk] = await Promise.all([
                    postWithTimeout(WEBHOOK_URL, requestOptions),
                    postWithTimeout(BACKUP_WEBHOOK_URL, requestOptions)
                ]);

                if (!primaryOk && !backupOk) {
                    if (leadSuccessMessage) {
                        leadSuccessMessage.hidden = false;
                        leadSuccessMessage.textContent = 'We could not submit your request. Please check your connection and try again.';
                        leadSuccessMessage.classList.add('is-error');
                    }
                    if (submitBtn) {
                        submitBtn.innerText = 'Try Again';
                        submitBtn.disabled = false;
                    }
                    return;
                }
            } catch (error) {
                console.error('Submission error:', error);
                if (leadSuccessMessage) {
                    leadSuccessMessage.hidden = false;
                    leadSuccessMessage.textContent = 'We could not submit your request. Please check your connection and try again.';
                    leadSuccessMessage.classList.add('is-error');
                }
                safeSetDisabled(false);
                if (submitBtn) submitBtn.innerText = 'Try Again';
                return;
            }

            if (leadSuccessMessage) {
                leadSuccessMessage.hidden = false;
                leadSuccessMessage.textContent = THANK_YOU_MESSAGE;
            }

            simulateBrochureDownload();

            if (submitBtn) {
                submitBtn.innerText = 'Brochure Requested';
                submitBtn.disabled = true;
            }
        };
    }

    // --- VIDEO THUMBNAILS ---
    document.querySelectorAll('.video-facade').forEach(el => {
        const id = el.getAttribute('data-id');
        if (!id) return;
        const img        = new Image();
        const highResUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        const standardUrl= `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        img.onload = function () {
            el.style.backgroundImage = `url(${this.width === 120 ? standardUrl : highResUrl})`;
        };
        img.src = highResUrl;
    });

    // --- SCARCITY ENGINE (Adapted for Admissions) ---
    const config = {
        totalSeats: 500,
        minSeats: 15
    };

    function initScarcity() {
        const sessionLabel = '2026-27';

        document.querySelectorAll('.webinar-date-shared').forEach(el => el.innerText = sessionLabel);

        // Simulate seats filling - admission context
        const now = new Date();
        const monthProgress = now.getMonth(); // 0-11
        let seatsLeft;

        if (monthProgress < 3) { // Jan-Mar: Early admission
            seatsLeft = Math.floor(config.totalSeats * 0.70);
        } else if (monthProgress < 6) { // Apr-Jun: Peak admission
            seatsLeft = Math.floor(config.totalSeats * 0.40);
        } else if (monthProgress < 9) { // Jul-Sep: Late admission
            seatsLeft = Math.floor(config.totalSeats * 0.15);
        } else { // Oct-Dec: Very limited
            seatsLeft = Math.max(config.minSeats, 20 + Math.floor(Math.random() * 10));
        }

        const percentFull = Math.round(((config.totalSeats - seatsLeft) / config.totalSeats) * 100);

        document.querySelectorAll('.seats-count-shared').forEach(el => el.innerText = seatsLeft);
        document.querySelectorAll('.percent-remaining-shared').forEach(el => el.innerText = (100 - percentFull) + "% Remaining");

        setTimeout(() => {
            document.querySelectorAll('.scarcity-fill-shared').forEach(el => {
                el.style.width = percentFull + "%";
                if ((100 - percentFull) < 20) el.style.background = "#8B0000";
            });
        }, 300);
    }

    initScarcity();

    // --- FAQ ACCORDION ---
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function () {
            const currentItem = this.closest('.faq-item');
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== currentItem) item.classList.remove('active');
            });
            currentItem.classList.toggle('active');
        });
    });

    // --- PASS URL PARAMS TO ALL LINKS ---
    const queryParams = window.location.search;
    if (queryParams) {
        document.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                link.setAttribute('href', href.indexOf('?') > -1 
                    ? href + '&' + queryParams.substring(1) 
                    : href + queryParams);
            }
        });
    }

})();
