const form = document.getElementById('complaintForm');
const submitBtn = document.getElementById('submitComplaint');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('imagePreview');
const formMessage = document.getElementById('formMessage');
const phoneInput = document.getElementById('phone');

if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const category = document.getElementById('category').value;
        const location = document.getElementById('location').value;
        const complaint = document.getElementById('complaint').value;
        const phone = document.getElementById('phone').value;
        const agree = document.getElementById('agree').checked;

        if (!category) {
            alert('Please select a complaint category.');
            return;
        }

        if (!location.trim()) {
            alert('Please enter your location.');
            return;
        }

        if (!complaint.trim()) {
            alert('Please describe your complaint.');
            return;
        }

        if (!phone.trim()) {
            alert('Please enter your phone number.');
            return;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (!/^[0-9]{10}$/.test(phoneDigits)) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }

        if (!agree) {
            alert('Please confirm that the information is accurate.');
            return;
        }

        const files = imageInput ? imageInput.files || [] : [];
        if (files.length > 3) {
            alert('Please upload no more than 3 images.');
            return;
        }

        const owner = window.GrowClean && window.GrowClean.getCurrentUser ? window.GrowClean.getCurrentUser() : null;
        if (!owner) {
            alert('Please login before submitting a complaint.');
            window.location.href = 'Login.html';
            return;
        }

        const complaintId = window.GrowClean && window.GrowClean.generateComplaintId
            ? window.GrowClean.generateComplaintId()
            : `GC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

        const now = new Date();
        const complaintObj = {
            id: complaintId,
            category,
            location,
            description: complaint,
            phone: phoneDigits,
            owner,
            dateFiled: now.toISOString().slice(0, 10),
            status: 'pending',
            progress: 0,
            updates: [{
                date: now.toISOString().slice(0, 10),
                text: 'Complaint received and registered',
                completed: true
            }],
            images: Array.from(files).slice(0, 3).map((f) => ({ name: f.name, size: f.size, type: f.type }))
        };

        try {
            if (window.GrowClean && window.GrowClean.saveComplaint) {
                window.GrowClean.saveComplaint(complaintObj);
            }
        } catch (error) {
            console.warn('Failed to persist complaint', error);
            alert('Something went wrong while saving your complaint.');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (formMessage) formMessage.textContent = `Submitted - Complaint ID ${complaintId}. Redirecting...`;

        setTimeout(() => {
            form.reset();
            if (imagePreview) imagePreview.innerHTML = '';
            window.location.href = `Status.html?id=${encodeURIComponent(complaintId)}`;
        }, 900);
    });

    form.addEventListener('reset', () => {
        if (imagePreview) imagePreview.innerHTML = '';
        if (formMessage) formMessage.textContent = '';
        if (submitBtn) submitBtn.disabled = false;
    });
}

if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.slice(0, 10);
        e.target.value = value;
    });
}

if (imageInput) {
    imageInput.addEventListener('change', () => {
        if (!imagePreview) return;

        const files = Array.from(imageInput.files || []);
        imagePreview.innerHTML = '';

        if (files.length === 0) return;

        if (files.length > 3) {
            if (formMessage) formMessage.textContent = 'Please select up to 3 images only.';
            imageInput.value = '';
            return;
        }

        files.slice(0, 3).forEach((file) => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            const wrapper = document.createElement('div');
            wrapper.style.width = '88px';
            wrapper.style.height = '64px';
            wrapper.style.overflow = 'hidden';
            wrapper.style.border = '1px solid #ddd';
            wrapper.style.borderRadius = '4px';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';

            const img = document.createElement('img');
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';

            reader.onload = (evt) => {
                img.src = evt.target.result;
            };

            reader.readAsDataURL(file);
            wrapper.appendChild(img);
            imagePreview.appendChild(wrapper);
        });

        if (formMessage) formMessage.textContent = '';
    });
}