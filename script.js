(function () {
    const modal = document.getElementById('regModal');
    const closeBtn = document.querySelector('.close-modal');
    const leadForm = document.getElementById('mdbLeadForm');

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
            e.preventDefault();
            modal.style.display = 'flex';
            const stickyBar = document.querySelector('.mobile-sticky-bar');
            if (stickyBar) stickyBar.style.display = 'none';
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
        modal.style.display = 'none';
        const stickyBar = document.querySelector('.mobile-sticky-bar');
        if (stickyBar) stickyBar.style.display = '';
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modal) closeModal(); };

    // --- FORM SUBMIT (with dual webhook) ---
    if (leadForm) {
        const WEBHOOK_URL        = "https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjcwNTZjMDYzNzA0MzE1MjZlNTUzNzUxMzAi_pc";
        const BACKUP_WEBHOOK_URL = "https://n8n.srv882352.hstgr.cloud/webhook/bda6fe45-e768-48ac-8ead-b27271650ad9";
        const THANK_YOU_PAGE     = "https://smsvaranasi.org/";

        leadForm.onsubmit = async function (e) {
            e.preventDefault();
            const submitBtn = leadForm.querySelector('button');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Submitting Application...";
            submitBtn.disabled = true;

            const payload = {
                name:          cleanParam(leadForm.first_name.value),
                email:         cleanParam(leadForm.email.value),
                phone:         cleanParam(leadForm.phone.value),
                program:       cleanParam(leadForm.business_type.value),
                education:     cleanParam(leadForm.turnover.value),
                utm_source:    cleanParam(trackingParams.utm_source),
                utm_medium:    cleanParam(trackingParams.utm_medium),
                utm_campaign:  cleanParam(trackingParams.utm_campaign),
                utm_content:   cleanParam(trackingParams.utm_content),
                gclid:         cleanParam(trackingParams.gclid),
                fbclid:        cleanParam(trackingParams.fbclid),
                affiliate:     cleanParam(trackingParams.affiliate),
                page_url:      window.location.href,
                timestamp:     new Date().toISOString()
            };

            const requestOptions = {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            };

            try {
                const primaryRequest = fetch(WEBHOOK_URL, requestOptions);
                const backupRequest  = (BACKUP_WEBHOOK_URL && BACKUP_WEBHOOK_URL.length > 5)
                    ? fetch(BACKUP_WEBHOOK_URL, requestOptions)
                    : Promise.resolve("No backup configured");

                await Promise.allSettled([primaryRequest, backupRequest]);
                window.location.href = THANK_YOU_PAGE;
            } catch (error) {
                console.error('Submission error:', error);
                window.location.href = THANK_YOU_PAGE;
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
