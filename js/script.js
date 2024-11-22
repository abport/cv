
document.addEventListener("DOMContentLoaded", function () {
    // Array to track the order of contact items in the preview
    const contactOrder = ["email", "phone", "linkedin", "website"];


    // Counter for unique "Other" contact item values
    let otherContactCounter = 0;

    // Display style variables for Experience and Education
    let experienceDisplayStyle = "inline";
    let educationDisplayStyle = "stacked"; // Default to stacked for Education

    // Initialize Sortable.js 
    var sortable = Sortable.create(
        document.getElementById("resumePreview"),
        {
            animation: 150,
            handle: ".section, .resume-header",
            ghostClass: "sortable-ghost",
        }
    );

    // Global variable to store photo src
    var photo = {
        src: "",
    };


    // HTML Sanitization Function 
    function sanitizeQuillHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find all ordered lists
        const orderedLists = doc.querySelectorAll('ol');

        orderedLists.forEach(ol => {
            // Create a new <ul> for bullet items
            let ul = document.createElement('ul');
            let hasBulletItems = false;

            // Iterate through each <li> in the <ol>
            Array.from(ol.children).forEach(li => {
                if (li.getAttribute('data-list') === 'bullet') {
                    // Move bullet-type <li> to <ul> and set flag
                    li.removeAttribute('data-list');
                    ul.appendChild(li);
                    hasBulletItems = true;
                } else {
                    // Keep ordered items in <ol>, remove unnecessary data attributes
                    li.removeAttribute('data-list');
                }

                // Remove <span> with class 'ql-ui' within <li>, if it exists
                const span = li.querySelector('span.ql-ui');
                if (span) span.remove();
            });

            // Insert the new <ul> before the <ol> if it contains bullet items
            if (hasBulletItems) {
                ol.parentNode.insertBefore(ul, ol);
            }
        });

        return doc.body.innerHTML;
    }

    // Register Font
    const Font = Quill.import('formats/font');
    Font.whitelist = [
        'arial',
        'calibri',
        'georgia',
        'tahoma',
        'times-new-roman',
        'verdana',
        'roboto',
        'montserrat',
        'open-sans',
        'raleway',
        'lato'
    ];
    Quill.register(Font, true);

    // Register Size
    const Size = Quill.import('formats/size');
    Size.whitelist = ['small', 'normal', 'large', 'huge'];
    Quill.register(Size, true);

    // Initialize Quill.js editor
    function initializeQuillEditor(
        containerElement,
        toolbarElement,
        previewElement,
        placeholder = "Enter text here..."
    ) {
        var quill = new Quill(containerElement, {
            modules: { toolbar: toolbarElement },
            theme: "snow",
            placeholder: placeholder,
        });

        quill.container.addEventListener("paste", function () {
            setTimeout(function () {
                updatePreviewForQuill(quill, previewElement);
            }, 0);
        });

        quill.on('text-change', function () {
            updatePreviewForQuill(quill, previewElement);
        });

        return quill;
    }

    function updatePreviewForQuill(quill, previewElement) {
        if (previewElement) {
            const sanitizedHTML = sanitizeQuillHTML(quill.root.innerHTML);
            previewElement.innerHTML = sanitizedHTML;

            // Apply any font properties directly from Quill's format
            const fontStyles = quill.getFormat();
            for (const style in fontStyles) {
                if (fontStyles[style] && previewElement.style[style] !== undefined) {
                    previewElement.style[style] = fontStyles[style];
                }
            }
            previewElement.style.lineHeight = quill.getFormat().lineHeight || 1.6; // Default lineHeight if not set

            // Manually apply indentation styles:
            const listItems = previewElement.querySelectorAll('li');
            listItems.forEach(li => {
                const indentLevel = li.className.match(/ql-indent-(\d+)/);
                if (indentLevel) {
                    const level = parseInt(indentLevel[1]);
                    li.style.paddingLeft = (level * 40) + "px !important"; // Force styles
                }
            });
        }
    }

    function getPreviewElementForQuill(quill) {
        var section = quill.container.closest(".accordion-item");
        if (section) {
            var sectionId = section.querySelector(".accordion-collapse").id;
            var sectionValue = sectionId.replace("collapse", "").toLowerCase();

            switch (sectionValue) {
                case "summary":
                    return document.getElementById("previewSummary");
                case "experience":
                    return quill.container
                        .closest(".experience-item")
                        .querySelector(".preview-experience-description");
                case "projects":
                    return quill.container
                        .closest(".project-item")
                        .querySelector(".preview-project-description");
                default:
                    return section.querySelector(".preview-new-section");
            }
        }
        return null;
    }

    var summaryEditor = initializeQuillEditor(
        document.getElementById("summaryTextEditor"),
        document.getElementById("summaryToolbar")
    );

    var experienceEditors = [];
    document.querySelectorAll('.experience-description-editor').forEach(function (editorContainer) {
        let editor = initializeQuillEditor(
            editorContainer,
            editorContainer.previousElementSibling
        );
        experienceEditors.push(editor);
        editor.on('text-change', function () {
            updateExperiencePreview();
        });
    });

    var projectEditors = [];
    document.querySelectorAll('.project-description-editor').forEach(function (editorContainer) {
        let editor = initializeQuillEditor(
            editorContainer,
            editorContainer.previousElementSibling
        );
        projectEditors.push(editor);
        editor.on('text-change', function () {
            updateProjectsPreview();
        });
    });

    var newSectionEditors = [];
    newSectionEditors.push(
        initializeQuillEditor(document.getElementById("new-section-editor"), document.getElementById("newSectionToolbar"))
    );

    // Update Contact Info
    document
        .getElementById("contactName")
        .addEventListener("input", function () {
            document.getElementById("previewName").textContent =
                this.value || "John Doe";
        });

    document
        .getElementById("contactTitle")
        .addEventListener("input", function () {
            document.getElementById("previewTitle").textContent =
                this.value || "Web Developer";
        });

    function formatContactInfo(type, value) {
        switch (type) {
            case "email":
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
            default:
                return value;
        }
    }

    // Handle Contact Items and Previews
    function updateContactInfoPreview(event) {
        const target = event.target;
        if (target.classList.contains("contact-input") || target.classList.contains("contact-link")) {
            const contactInfo = document.getElementById("previewContactInfo");
            const contactItem = target.closest(".contact-item");
            const includeItemCheckbox = contactItem.querySelector(".include-contact-item");
            const contactInput = contactItem.querySelector(".contact-input");
            const contactLink = contactItem.querySelector(".contact-link");
            const value = formatContactInfo(includeItemCheckbox.value, contactInput.value.trim());
            const link = contactLink ? contactLink.value.trim() : "";
            const type = includeItemCheckbox.value;

            let previewElement = contactInfo.querySelector("#preview" + type);

            if (includeItemCheckbox.checked && value !== "") {
                if (!previewElement) {
                    previewElement = document.createElement("p");
                    previewElement.id = "preview" + type;
                    insertContactPreviewElementInOrder(contactInfo, previewElement, type);
                }

                if (link) {
                    var aTag = document.createElement("a");
                    aTag.href = link;
                    aTag.textContent = value;
                    previewElement.innerHTML = "";
                    previewElement.appendChild(aTag);
                } else {
                    previewElement.textContent = value;
                }

                if (contactData[type]) {
                    previewElement.style.fontFamily = contactData[type].fontFamily;
                    previewElement.style.fontSize = contactData[type].fontSize;
                    previewElement.style.color = contactData[type].color;
                }
            } else if (previewElement) {
                previewElement.remove();
            }
        }
    }

    function insertContactPreviewElementInOrder(contactInfo, previewElement, type) {
        const previewElements = contactInfo.querySelectorAll("p");
        let insertBeforeElement = null;
        for (let i = 0; i < previewElements.length; i++) {
            const currentType = previewElements[i].id.replace("preview", "");
            if (contactOrder.indexOf(type) < contactOrder.indexOf(currentType)) {
                insertBeforeElement = previewElements[i];
                break;
            }
        }
        if (insertBeforeElement) {
            contactInfo.insertBefore(previewElement, insertBeforeElement);
        } else {
            contactInfo.appendChild(previewElement);
        }
    }

    // Store contact data and font styles
    var contactData = {};

    document
        .getElementById("contactItemsContainer")
        .addEventListener("input", updateContactInfoPreview);

    // Add Contact Item Functionality
    document
        .getElementById("addContactItem")
        .addEventListener("click", function () {
            var container = document.getElementById("contactItemsContainer");
            var newId = "includeContact" + Date.now();
            var newType = "other" + otherContactCounter++;
            var newItem = document.createElement("div");
            newItem.classList.add("contact-item", "mb-3", "role", "group");
            newItem.innerHTML = `<div class="form-group">
<div class="form-check">
<input class="form-check-input include-contact-item" type="checkbox" value="${newType}" id="${newId}" checked>
<label class="form-check-label" for="${newId}">
<i class="bi bi-info-circle-fill" aria-hidden="true"></i>
</label>
</div>
<div class="floating-label-container">
<input type="text" class="form-control contact-input" id="contact${newId}" required placeholder="Enter your info">
<label for="contact${newId}">Enter your info</label>
</div>
<div class="floating-label-container floating-label-link">
<input type="text" class="form-control contact-link" id="link${newId}" placeholder="Optional Link">
<label for="link${newId}">Link (Optional)</label>
</div>
</div>`;
            container.appendChild(newItem);
            addEditButton(`contact${newId}`, true);
            contactOrder.push(newType);
            var newInput = newItem.querySelector(".contact-input");
            newInput.dispatchEvent(new Event("input"));
        });
    document
        .getElementById("contactItemsContainer")
        .addEventListener("change", function (event) {
            if (event.target.classList.contains("include-contact-item")) {
                var checkbox = event.target;
                var type = checkbox.value;
                var previewElement = document.getElementById("preview" + type);
                if (checkbox.checked) {
                    previewElement.style.display = "";
                } else {
                    previewElement.style.display = "none";
                }
            }
        });
    // Handle Contact Info Display
    document
        .getElementById("contactInfoDisplay")
        .addEventListener("change", function () {
            var contactInfo = document.getElementById("resumeHeaderInfo");
            var displayStyle = this.value;
            contactInfo.classList.remove("stacked", "inline");
            contactInfo.classList.add(displayStyle);
            updateContactInfoPreview({ target: contactInfo });
        });

    // Handle Photo Upload
    document
        .getElementById("photoUpload")
        .addEventListener("change", function (e) {
            var file = e.target.files[0];
            if (file && file.type.startsWith("image/")) {
                var reader = new FileReader();
                reader.onload = function (evt) {
                    photo.src = evt.target.result;
                    document.getElementById("resumePhoto").src = photo.src;
                    document.getElementById("resumePhotoContainer").style.display =
                        "block";
                };
                reader.onerror = function (error) {
                    console.error("Error reading file:", error);
                    alert("An error occurred while uploading the photo. Please try again.");
                };
                reader.readAsDataURL(file);
            }
        });

    // Handle Photo Position
    document
        .getElementById("photoPosition")
        .addEventListener("change", function () {
            var position = this.value;
            var header = document.querySelector(".resume-header");
            var photoContainer = document.getElementById(
                "resumePhotoContainer"
            );
            var contactInfo = document.getElementById("resumeHeaderInfo");

            header.classList.remove("left", "right", "center");
            photoContainer.classList.remove("left", "right", "center");
            header.classList.add(position);

            if (position === "right") {
                header.style.flexDirection = "row-reverse";
                photoContainer.style.marginLeft = "20px";
                photoContainer.style.marginRight = "0";
            } else if (position === "center") {
                header.style.flexDirection = "column";
                photoContainer.style.margin = "0 auto 20px auto";
            } else {
                header.style.flexDirection = "row";
                photoContainer.style.marginRight = "20px";
                photoContainer.style.marginLeft = "0";
            }
            contactInfo.style.textAlign =
                document.getElementById("contactAlignment").value;
        });

    // Handle Contact Information Alignment
    document
        .getElementById("contactAlignment")
        .addEventListener("change", function () {
            var alignment = this.value;
            var contactInfo = document.getElementById("resumeHeaderInfo");
            contactInfo.style.textAlign = alignment;
        });

    document
        .getElementById("nameAlignment")
        .addEventListener("change", function () {
            document.getElementById("previewName").style.textAlign = this.value;
        });

    document
        .getElementById("titleAlignment")
        .addEventListener("change", function () {
            document.getElementById("previewTitle").style.textAlign =
                this.value;
        });

    document
        .getElementById("photoPosition")
        .dispatchEvent(new Event("change"));
    document
        .getElementById("contactAlignment")
        .dispatchEvent(new Event("change"));

    // --- Summary Section ---

    // Summary Quill text-change event
    summaryEditor.on("text-change", function () {
        let fontSizeClass = summaryEditor.getFormat().size;
        let previewSummary = document.getElementById("previewSummary");
        previewSummary.className = '';
        if (fontSizeClass) {
            previewSummary.classList.add(fontSizeClass);
        }
        previewSummary.innerHTML = sanitizeQuillHTML(summaryEditor.root.innerHTML);
        applyLineHeightToSection("section-summary", sectionLineHeights.summary);
    });

    // Summary Title Input
    document
        .getElementById("summaryTitle")
        .addEventListener("input", function () {
            document.getElementById("summarySectionTitle").textContent =
                this.value || "Summary";
        });

    // --- Education Section ---

    let educationCounter = 1;


    // Add Education Button
    document
        .getElementById("addEducation")
        .addEventListener("click", function () {
            var educationList = document.getElementById("educationList");
            var newItem = document.createElement("div");
            var uniqueId = educationCounter++;
            newItem.classList.add("mb-3", "education-item", "role", "group");
            newItem.innerHTML = `<div class="floating-label-container">
<input type="text" class="form-control degree" id="degree-${uniqueId}"
placeholder="Degree" required>
<label class="form-label">Degree</label>
</div>
<div class="floating-label-container">
<input type="text" class="form-control institution" id="institution-${uniqueId}"
placeholder="Institution Name" required>
<label class="form-label">Institution Name</label>
</div>
<div class="floating-label-container">
<input type="text" class="form-control year" id="year-${uniqueId}" placeholder="2015 - 2019"
required>
<label class="form-label">Year (2015 - 2019)</label>
</div>
<!-- Radio buttons for Education Display Style -->
<div class="mb-3">
<label class="form-label">Education Display Style</label>
<div class="form-check">
<input class="form-check-input" type="radio" name="educationDisplay-${uniqueId}" 
id="educationStacked-${uniqueId}" value="stacked" checked>
<label class="form-check-label" for="educationStacked-${uniqueId}">
Stacked
</label>
</div>
<div class="form-check">
<input class="form-check-input" type="radio" name="educationDisplay-${uniqueId}" 
id="educationInline-${uniqueId}" value="inline">
<label class="form-check-label" for="educationInline-${uniqueId}">
Inline
</label>
</div>
</div>
<button class="btn btn-danger btn-sm mt-2 remove-education">
Remove
</button>
`;
            educationList.appendChild(newItem);
            addEditButton(`degree-${uniqueId}`);
            addEditButton(`institution-${uniqueId}`);
            addEditButton(`year-${uniqueId}`);
            //updateEducationPreview(); 
        });


    // Remove Education Button
    document
        .getElementById("educationList")
        .addEventListener("click", function (e) {
            if (e.target.classList.contains("remove-education")) {
                e.target.parentElement.remove();
                updateEducationPreview();
            }
        });

    // Update Education Preview
    function updateEducationPreview() {
        var educationItems = document.querySelectorAll(".education-item");
        var preview = document.getElementById("previewEducation");
        preview.innerHTML = "";

        educationItems.forEach(function (item, index) { // Include index in the loop
            var degree = item.querySelector(".degree").value.trim();
            var institution = item.querySelector(".institution").value.trim();
            var year = item.querySelector(".year").value.trim();

            // --- Update radio button names and IDs to match the new index ---

            var stackedRadio = item.querySelector(`input[name^="educationDisplay-"]`);
            var inlineRadio = item.querySelector(`input[value="inline"]`);

            if (stackedRadio && inlineRadio) {
                stackedRadio.name = `educationDisplay-${index}`;
                stackedRadio.id = `educationStacked-${index}`;
                stackedRadio.nextElementSibling.setAttribute('for', `educationStacked-${index}`); // Update label's for attribute

                inlineRadio.name = `educationDisplay-${index}`;
                inlineRadio.id = `educationInline-${index}`;
                inlineRadio.nextElementSibling.setAttribute('for', `educationInline-${index}`); // Update label's for attribute
            }

            // Get the checked radio button (if any) using the updated name
            var checkedRadioButton = item.querySelector(`input[name="educationDisplay-${index}"]:checked`);
            var isInline = checkedRadioButton ? checkedRadioButton.value === 'inline' : false;

            if (degree !== "" || institution !== "") {
                var li = document.createElement("li");
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.alignItems = "center";

                var degreeInstitutionDiv = document.createElement("div");
                if (isInline) {
                    degreeInstitutionDiv.innerHTML = `<h6><strong>${degree}</strong> - <span>${institution}</span></h6>`;
                } else {
                    degreeInstitutionDiv.innerHTML = `<h6><strong>${degree}</strong><br><span>${institution}</span></h6>`;
                }
                li.appendChild(degreeInstitutionDiv);

                var yearDiv = document.createElement("div");
                yearDiv.classList.add("dates");
                yearDiv.innerHTML = `<span>${year}</span>`;
                li.appendChild(yearDiv);

                preview.appendChild(li);
            }
        });
        applyLineHeightToSection("section-education", sectionLineHeights.education);
    }

    // Education Input Change Listener
    document
        .getElementById("educationList")
        .addEventListener("input", updateEducationPreview);

    // Add event listener to educationList to reset counter if empty
    document.getElementById("educationList").addEventListener("click", function (e) {
        if (e.target.classList.contains("remove-education")) {
            e.target.parentElement.remove();
            updateEducationPreview();

            // Reset educationCounter if the list is empty
            if (document.querySelectorAll(".education-item").length === 0) {
                educationCounter = 0;
            }
        }
    });

    // Education Title Input 
    document
        .getElementById("educationTitle")
        .addEventListener("input", function () {
            document.getElementById("educationSectionTitle").textContent =
                this.value || "Education";
        });

    // --- Experience Section ---

    let experienceCounter = 1;

    // Add Experience Button
    document
        .getElementById("addExperience")
        .addEventListener("click", function () {
            var experienceList = document.getElementById("experienceList");
            var newItem = document.createElement("div");
            var uniqueId = experienceCounter++;
            newItem.classList.add("mb-3", "experience-item", "role", "group");
            newItem.innerHTML = `<div class="floating-label-container">
<input type="text" class="form-control job-title" id="job-title-${uniqueId}"
placeholder="Job Title" required>
<label class="form-label">Job Title</label>

</div>
<div class="floating-label-container">
<input type="text" class="form-control company" id="company-${uniqueId}" placeholder="ABC Corp"
required>
<label class="form-label">Company</label>
</div>
<div class="mb-3">
<label class="form-label">Experience Display Style</label>
<div class="form-check">
<input class="form-check-input" type="radio" name="experienceDisplay-${uniqueId}" id="experienceInline-${uniqueId}"
value="inline" checked>
<label class="form-check-label" for="experienceInline-${uniqueId}">
Inline
</label>
</div>
<div class="form-check">
<input class="form-check-input" type="radio" name="experienceDisplay-${uniqueId}" id="experienceStacked-${uniqueId}"
value="stacked">
<label class="form-check-label" for="experienceStacked-${uniqueId}">
Stacked
</label>
</div>
</div>
<div class="floating-label-container">
<input type="text" class="form-control duration" id="duration-${uniqueId}"
placeholder="Jan 2020 - Present" required>
<label class="form-label">Duration (Jan 2020 - Present)</label>
</div>
<label class="form-label mt-2">Description</label>
<div class="experience-description-toolbar">
<select class="ql-font">
<option value="arial" selected>Arial</option>
<option value="calibri">Calibri</option>
<option value="georgia">Georgia</option>
<option value="tahoma">Tahoma</option>
<option value="times-new-roman">Times New Roman</option>
<option value="verdana">Verdana</option>
<option value="roboto">Roboto</option>
<option value="montserrat">Montserrat</option>
<option value="open-sans">Open Sans</option>
<option value="raleway">Raleway</option>
<option value="lato">Lato</option>
</select>
<select class="ql-size">
<option value="small"></option>
<option selected></option>
<option value="large"></option>
<option value="huge"></option>
</select>
<button class="ql-bold"></button>
<button class="ql-italic"></button>
<button class="ql-underline"></button>
<button class="ql-strike"></button>
<select class="ql-color"></select>
<select class="ql-background"></select>
<select class="ql-align">
<option selected></option>
<option value="center"></option>
<option value="right"></option>
<option value="justify"></option>
</select>
<button class="ql-list" value="ordered"></button>
<button class="ql-list" value="bullet"></button>
<button class="ql-indent" value="-1"></button>
<button class="ql-indent" value="+1"></button>
<button class="ql-blockquote"></button>
<button class="ql-code-block"></button>
<button class="ql-direction" value="rtl"></button>
<button class="ql-script" value="sub"></button>
<button class="ql-script" value="super"></button>
<select class="ql-header">
<option selected></option>
<option value="1">Heading 1</option>
<option value="2">Heading 2</option>
<option value="3">Heading 3</option>
</select>
<button class="ql-link"></button>
<button class="ql-image"></button>
<button class="ql-video"></button>
<button class="ql-formula"></button>
<button class="ql-clean"></button>
</div>
<div class="experience-description-editor" id="experience-description-editor-${uniqueId}"></div>
<textarea class="form-control description" rows="3" style="display: none;"
placeholder="Job responsibilities and achievements..."></textarea>
<button class="btn btn-danger btn-sm mt-2 remove-experience">Remove</button>
`;
            experienceList.appendChild(newItem);

            let newEditor = initializeQuillEditor(
                newItem.querySelector(`#experience-description-editor-${uniqueId}`),
                newItem.querySelector('.experience-description-toolbar')
            );
            experienceEditors.push(newEditor);
            newEditor.on('text-change', function () {
                updateExperiencePreview();
            });
            addEditButton(`job-title-${uniqueId}`);
            addEditButton(`company-${uniqueId}`);
            addEditButton(`duration-${uniqueId}`);

            updateExperiencePreview(); // Update preview after adding item
        });

    // Remove Experience Button
    // Add event listener to experienceList to reset counter if empty
    document.getElementById("experienceList").addEventListener("click", function (e) {
        if (e.target.classList.contains("remove-experience")) {
            let editorIndex = Array.from(document.querySelectorAll(".experience-item")).indexOf(e.target.parentElement);
            experienceEditors.splice(editorIndex, 1);
            e.target.parentElement.remove();
            updateExperiencePreview();

            // Reset experienceCounter if the list is empty
            if (document.querySelectorAll(".experience-item").length === 0) {
                experienceCounter = 0;
            }
        }
    });

    // Update Experience Preview
    function updateExperiencePreview() {
        var experiences = document.querySelectorAll(".experience-item");
        var preview = document.getElementById("previewExperience");
        preview.innerHTML = "";

        experiences.forEach(function (exp, index) {
            var title = exp.querySelector(".job-title").value.trim();
            var company = exp.querySelector(".company").value.trim();
            var duration = exp.querySelector(".duration").value.trim();
            var description = experienceEditors[index].root.innerHTML;

            // 1.  Create the description container :
            var descriptionContainer = document.createElement("div");
            descriptionContainer.classList.add("preview-experience-description");

            // 2. Append the Quill editor content to the container:
            var descriptionHTML = experienceEditors[index].root.innerHTML;

            // 3. Sanitize and insert the content:
            descriptionContainer.innerHTML = sanitizeQuillHTML(experienceEditors[index].root.innerHTML);

            // --- Update radio button names and IDs to match the new index ---
            var inlineRadio = exp.querySelector(`input[value="inline"]`);
            var stackedRadio = exp.querySelector(`input[value="stacked"]`);

            if (inlineRadio && stackedRadio) {
                inlineRadio.name = `experienceDisplay-${index}`;
                inlineRadio.id = `experienceInline-${index}`;
                inlineRadio.nextElementSibling.setAttribute('for', `experienceInline-${index}`);

                stackedRadio.name = `experienceDisplay-${index}`;
                stackedRadio.id = `experienceStacked-${index}`;
                stackedRadio.nextElementSibling.setAttribute('for', `experienceStacked-${index}`);
            }
            // --- End of radio button update ---

            // Get the display style for THIS experience item using updated name
            var displayStyle = exp.querySelector(`input[name^="experienceDisplay-${index}"]:checked`).value;

            if (title !== "" || company !== "") {
                // Create an <article> element for each experience entry
                var article = document.createElement("article");

                // Create a div with flexbox for title, company, and duration
                var titleCompanyDurationDiv = document.createElement("div");
                titleCompanyDurationDiv.style.display = "flex";
                titleCompanyDurationDiv.style.justifyContent = "space-between";
                titleCompanyDurationDiv.style.alignItems = "center"; // Vertically align items

                // Use <h6> and separate spans for job title and company
                var titleCompanyEl = document.createElement("h6");

                var titleSpan = document.createElement("strong"); // Span for job title
                titleSpan.textContent = title;
                titleCompanyEl.appendChild(titleSpan);

                // Conditional separator based on display style
                if (displayStyle === "inline") {
                    titleCompanyEl.append(" - "); // Add " - " for inline
                } else if (displayStyle === "stacked") {
                    titleCompanyEl.append(document.createElement("br")); // Add line break for stacked
                }

                var companySpan = document.createElement("em"); // Use <em> for company for italics in stacked
                companySpan.textContent = company;
                titleCompanyEl.appendChild(companySpan);

                titleCompanyDurationDiv.appendChild(titleCompanyEl);
                var durationDiv = document.createElement("div");
                durationDiv.classList.add("dates");
                durationDiv.innerHTML = `<p><span>${duration}</span></p>`;
                titleCompanyDurationDiv.appendChild(durationDiv);

                article.appendChild(titleCompanyDurationDiv);

                article.appendChild(descriptionContainer); // Append the description container
                preview.appendChild(article); // Append the article to preview
            }
        });
        applyLineHeightToSection("section-experience", sectionLineHeights.experience);
    }

    // Experience Input Change Listener
    document
        .getElementById("experienceList")
        .addEventListener("input", updateExperiencePreview);

    // Experience Title Input
    document
        .getElementById("experienceTitle")
        .addEventListener("input", function () {
            document.getElementById("experienceSectionTitle").textContent =
                this.value || "Experience";
        });

    // --- Skills Section ---

    // Add Skills Functionality
    var skillsInput = document.getElementById("skillsInput");
    var addSkillButton = document.getElementById("addSkill");

    function addSkillToList() {
        var skill = skillsInput.value.trim();
        if (skill !== "") {
            var skillsList = document.getElementById("skillsList");
            var li = document.createElement("li");
            li.classList.add(
                "list-group-item",
                "d-flex",
                "justify-content-between",
                "align-items-center"
            );
            li.textContent = skill;
            var removeBtn = document.createElement("button");
            removeBtn.classList.add("btn", "btn-danger", "btn-sm");
            removeBtn.innerHTML = '<i class="bi bi-trash3-fill"></i>';
            removeBtn.addEventListener("click", function () {
                li.remove();
                updateSkillsPreview();
            });
            li.appendChild(removeBtn);
            skillsList.appendChild(li);
            skillsInput.value = "";
            updateSkillsPreview();
        }
    }

    addSkillButton.addEventListener("click", addSkillToList);

    skillsInput.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            addSkillToList();
        }
    });

    // Show/Hide Table Options based on Skills Display selection
    var skillsDisplayRadios = document.querySelectorAll('input[name="skillsDisplay"]');
    var tableColumnsContainer = document.getElementById("tableColumnsContainer");
    var tableCellSpacingContainer = document.getElementById("tableCellSpacingContainer");

    skillsDisplayRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.value === 'table') {
                tableColumnsContainer.style.display = 'block';
                tableCellSpacingContainer.style.display = 'block';
            } else {
                tableColumnsContainer.style.display = 'none';
                tableCellSpacingContainer.style.display = 'none';
            }
            updateSkillsPreview(); // Update preview on radio button change
        });
    });

    // Update Skills Preview
    function updateSkillsPreview() {
        var skills = document.querySelectorAll("#skillsList li");
        var preview = document.getElementById("previewSkills");
        preview.innerHTML = "";

        var skillsDisplayStyle = document.querySelector('input[name="skillsDisplay"]:checked').value;

        if (skillsDisplayStyle === "list") {
            var ul = document.createElement("ul");
            skills.forEach(function (skill) {
                var li = document.createElement("li");
                li.textContent = skill.firstChild.textContent;
                ul.appendChild(li);
            });
            preview.appendChild(ul);
        } else if (skillsDisplayStyle === "table") {
            var table = document.createElement("table");

            // Get number of columns from input
            var numColumns = parseInt(document.getElementById("tableColumnCount").value);

            // Get cell spacing from input
            var cellSpacing = parseInt(document.getElementById("tableCellSpacing").value);
            table.style.borderSpacing = cellSpacing + "px"; // Apply cell spacing

            var currentRow = table.insertRow();
            var cellIndex = 0;

            skills.forEach(function (skill) {
                var cell = currentRow.insertCell();
                cell.textContent = skill.firstChild.textContent;

                // Apply cell spacing (padding) to the cell
                cell.style.padding = cellSpacing + "px";

                cellIndex++;
                if (cellIndex >= numColumns) {
                    currentRow = table.insertRow();
                    cellIndex = 0;
                }
            });

            preview.appendChild(table);
        } applyLineHeightToSection("section-skills", sectionLineHeights.skills);
    }

    // Skills Display Style Change Listener
    document.querySelectorAll('input[name="skillsDisplay"]').forEach(function (radio) {
        radio.addEventListener("change", updateSkillsPreview);
    });

    // Skills Title Input 
    document
        .getElementById("skillsTitle")
        .addEventListener("input", function () {
            document.getElementById("skillsSectionTitle").textContent =
                this.value || "Skills";
        });

    // Event Listeners for Table Options
    document.getElementById("tableColumnCount").addEventListener("input", updateSkillsPreview);
    document.getElementById("tableCellSpacing").addEventListener("input", updateSkillsPreview);

    // --- Projects Section ---

    let projectCounter = 1;

    // Add Project Button
    document
        .getElementById("addProject")
        .addEventListener("click", function () {
            var projectsList = document.getElementById("projectsList");
            var newItem = document.createElement("div");
            var uniqueId = projectCounter++;
            newItem.classList.add("mb-3", "project-item", "role", "group");
            newItem.innerHTML = `<div class="floating-label-container">
<input type="text" class="form-control project-name" id="project-name-${uniqueId}"
placeholder="Project XYZ" required>
<label class="form-label">Project Name</label>

</div>
<label class="form-label mt-2">Description</label>
<div class="project-description-toolbar">
<select class="ql-font">
<option value="arial" selected>Arial</option>
<option value="calibri">Calibri</option>
<option value="georgia">Georgia</option>
<option value="tahoma">Tahoma</option>
<option value="times-new-roman">Times New Roman</option>
<option value="verdana">Verdana</option>
<option value="roboto">Roboto</option>
<option value="montserrat">Montserrat</option>
<option value="open-sans">Open Sans</option>
<option value="raleway">Raleway</option>
<option value="lato">Lato</option>
</select>
<select class="ql-size">
<option value="small"></option>
<option selected></option>
<option value="large"></option>
<option value="huge"></option>
</select>
<button class="ql-bold"></button>
<button class="ql-italic"></button>
<button class="ql-underline"></button>
<button class="ql-strike"></button>
<select class="ql-color"></select>
<select class="ql-background"></select>
<select class="ql-align">
<option selected></option>
<option value="center"></option>
<option value="right"></option>
<option value="justify"></option>
</select>
<button class="ql-list" value="ordered"></button>
<button class="ql-list" value="bullet"></button>
<button class="ql-indent" value="-1"></button>
<button class="ql-indent" value="+1"></button>
<button class="ql-blockquote"></button>
<button class="ql-code-block"></button>
<button class="ql-direction" value="rtl"></button>
<button class="ql-script" value="sub"></button>
<button class="ql-script" value="super"></button>
<select class="ql-header">
<option selected></option>
<option value="1">Heading 1</option>
<option value="2">Heading 2</option>
<option value="3">Heading 3</option>
</select>
<button class="ql-link"></button>
<button class="ql-image"></button>
<button class="ql-video"></button>
<button class="ql-formula"></button>
<button class="ql-clean"></button>
</div>
<div class="project-description-editor" id="project-description-editor-${uniqueId}"></div>
<textarea class="form-control project-description" rows="2" style="display: none;"
placeholder="Brief description..."></textarea>
<button class="btn btn-danger btn-sm mt-2 remove-project">Remove</button>`;
            projectsList.appendChild(newItem);
            let newEditor = initializeQuillEditor(
                newItem.querySelector(`#project-description-editor-${uniqueId}`),
                newItem.querySelector('.project-description-toolbar')
            );
            projectEditors.push(newEditor);
            newEditor.on('text-change', function () {
                updateProjectsPreview();
            });
            addEditButton(`project-name-${uniqueId}`);
        });
    // Remove Project Button
    document
        .getElementById("projectsList")
        .addEventListener("click", function (e) {
            if (e.target.classList.contains("remove-project")) {
                let editorIndex = Array.from(
                    document.querySelectorAll(".project-item")
                ).indexOf(e.target.parentElement);
                projectEditors.splice(editorIndex, 1);
                e.target.parentElement.remove();
                updateProjectsPreview();
            }
        });

    // Update Projects Preview
    function updateProjectsPreview() {
        var projects = document.querySelectorAll(".project-item");
        var preview = document.getElementById("previewProjects");
        preview.innerHTML = "";
        projects.forEach(function (proj, index) {
            var name = proj.querySelector(".project-name").value.trim();
            var desc = projectEditors[index].root.innerHTML;
            if (name !== "") {
                var div = document.createElement("div");
                div.className = 'itemProj';
                div.innerHTML = `<h6><strong>${name}</strong></h6>
<div class="preview-project-description">${desc}</div>
`;
                // Sanitize before adding to preview:
                div.innerHTML = sanitizeQuillHTML(div.innerHTML);
                preview.appendChild(div);
            }
        });
        applyLineHeightToSection("section-projects", sectionLineHeights.projects);
    }
    // Project Input Change Listener
    document
        .getElementById("projectsList")
        .addEventListener("input", updateProjectsPreview);

    // Projects Title Input
    document
        .getElementById("projectsTitle")
        .addEventListener("input", function () {
            document.getElementById("projectsSectionTitle").textContent =
                this.value || "Projects";
        });

    // --- Line Height Functionality ---

    // Object to store line heights for each section
    var sectionLineHeights = {
        summary: 1.6,
        education: 1.6,
        experience: 1.6,
        skills: 1.6,
        projects: 1.6,
        contact: 1.6
    };

    // Function to apply line height to all elements in a section
    function applyLineHeightToSection(sectionId, lineHeight) {
        const previewElement = document.querySelector(`#${sectionId}`);
        if (previewElement) {
            previewElement.style.lineHeight = lineHeight; // Apply to the container
            const childElements = previewElement.querySelectorAll('*'); // Select all child elements
            childElements.forEach(element => {
                element.style.lineHeight = lineHeight; // Apply line height to children
            });
        }
    }

    // Summary Line Height Slider
    var summaryLineHeightSlider = document.getElementById("summaryLineHeight");
    var summaryLineHeightValue = document.getElementById("summaryLineHeightValue");
    summaryLineHeightSlider.addEventListener("input", function () {
        summaryLineHeightValue.textContent = this.value;
        sectionLineHeights.summary = this.value;
        applyLineHeightToSection("section-summary", this.value);
    });

    // Education Line Height Slider
    var educationLineHeightSlider = document.getElementById("educationLineHeight");
    var educationLineHeightValue = document.getElementById("educationLineHeightValue");
    educationLineHeightSlider.addEventListener("input", function () {
        educationLineHeightValue.textContent = this.value;
        sectionLineHeights.education = this.value;
        applyLineHeightToSection("section-education", this.value);
    });

    // Experience Line Height Slider
    var experienceLineHeightSlider = document.getElementById("experienceLineHeight");
    var experienceLineHeightValue = document.getElementById("experienceLineHeightValue");
    experienceLineHeightSlider.addEventListener("input", function () {
        experienceLineHeightValue.textContent = this.value;
        sectionLineHeights.experience = this.value;
        applyLineHeightToSection("section-experience", this.value);
    });

    // Skills Line Height Slider
    var skillsLineHeightSlider = document.getElementById("skillsLineHeight");
    var skillsLineHeightValue = document.getElementById("skillsLineHeightValue");
    skillsLineHeightSlider.addEventListener("input", function () {
        skillsLineHeightValue.textContent = this.value;
        sectionLineHeights.skills = this.value;
        applyLineHeightToSection("section-skills", this.value);
    });

    // Projects Line Height Slider
    var projectsLineHeightSlider = document.getElementById("projectsLineHeight");
    var projectsLineHeightValue = document.getElementById("projectsLineHeightValue");
    projectsLineHeightSlider.addEventListener("input", function () {
        projectsLineHeightValue.textContent = this.value;
        sectionLineHeights.projects = this.value;
        applyLineHeightToSection("section-projects", this.value);
    });

    // Contact Line Height Slider
    var contactLineHeightSlider = document.getElementById("contactLineHeight");
    var contactLineHeightValue = document.getElementById("contactLineHeightValue");
    contactLineHeightSlider.addEventListener("input", function () {
        contactLineHeightValue.textContent = this.value;
        sectionLineHeights.contact = this.value;
        applyLineHeightToSection("section-photo", this.value);
    });

    // --- Section Spacing Functionality ---
    var sectionSpacingInput = document.getElementById("sectionSpacing");

    sectionSpacingInput.addEventListener("input", function () {
        var spacing = this.value + "px";
        var sections = document.querySelectorAll(".resume-section");
        sections.forEach(function (section) {
            section.style.marginBottom = spacing;
        });
    });

    // --- Toggle Sections ---
    var toggles = document.querySelectorAll(".toggle-section");
    toggles.forEach(function (toggle) {
        toggle.addEventListener("change", function () {
            var sectionId = "section-" + this.value;
            var section = document.getElementById(sectionId);
            if (this.value === "photo") {
                if (this.checked) {
                    section.style.display = "flex";
                    var photoDisplay = photo.src ? "block" : "none";
                    document.getElementById("resumePhotoContainer").style.display =
                        photoDisplay;
                } else {
                    document.getElementById("resumePhotoContainer").style.display =
                        "none";
                }
            } else if (this.value === "contact") {
                var contactInfo = document.getElementById("resumeHeaderInfo");
                if (this.checked) {
                    contactInfo.style.display = "block";
                } else {
                    contactInfo.style.display = "none";
                }
            } else {
                if (this.checked) {
                    section.style.display = "block";
                } else {
                    section.style.display = "none";
                }
            }
        });
    });

    // --- Font Styling Functionality ---

    // Object to store font styles
    var elementStyles = {};
    var fontModal = new bootstrap.Modal(document.getElementById("fontModal"));
    var modalFontFamily = document.getElementById("modalFontFamily");
    var modalCustomFontInput = document.getElementById("modalCustomFont");
    var modalFontSize = document.getElementById("modalFontSize");
    var modalFontColor = document.getElementById("modalFontColor");
    var modalTitleBorderColorContainer = document.getElementById("modalTitleBorderColorContainer");
    var modalTitleBorderColor = document.getElementById("modalTitleBorderColor");
    var currentTargetElement = null;

    function addEditButton(inputId, isContactItem = false) {
        var inputField = document.getElementById(inputId);
        if (inputField) {
            var editButton = document.createElement("button");
            editButton.type = "button";
            editButton.classList.add(
                "btn",
                "btn-outline-primary",
                "btn-sm",
                "edit-font-btn"
            );
            editButton.innerHTML = "<i class='bi bi-pencil-square'></i>";

            editButton.addEventListener("click", function () {
                var sectionId = getSectionIdForInput(inputField);
                var collapseElement = document.getElementById(`collapse${sectionId}`);
                if (collapseElement && collapseElement.classList.contains('collapse')) {
                    collapseElement.addEventListener('shown.bs.collapse', () => {
                        applyStylesToSection(inputField, isContactItem);
                    }, { once: true });
                } else {
                    applyStylesToSection(inputField, isContactItem);
                }
                openFontModal(inputField, isContactItem);
            });

            var inputGroup = document.createElement("div");
            inputGroup.classList.add("input-group-with-btn");
            inputField.parentNode.parentNode.insertBefore(
                inputGroup,
                inputField.parentNode
            );

            inputGroup.appendChild(inputField.parentNode);
            inputGroup.appendChild(editButton);
        } else {
            console.error(`Element with ID "${inputId}" not found.`);
        }
    }

    function applyStylesToSection(inputField, isContactItem = false) {
        var previewElement = getPreviewElementForInput(inputField);
        if (previewElement && elementStyles[inputField.id]) {
            var styles = elementStyles[inputField.id];
            for (var prop in styles) {
                previewElement.style[prop] = styles[prop];
            }
        }
    }

    function getSectionIdForInput(inputElement) {
        var elementId = inputElement.id;

        if (elementId === "contactName" || elementId === "contactTitle") {
            return "Contact";
        } else if (
            elementId.startsWith("degree") ||
            elementId.startsWith("institution") ||
            elementId.startsWith("year")
        ) {
            return "Education";
        } else if (
            elementId.startsWith("job-title") ||
            elementId.startsWith("company") ||
            elementId.startsWith("duration")
        ) {
            return "Experience";
        } else if (elementId.startsWith("project-name")) {
            return "Projects";
        } else if (elementId === "summaryTitle") {
            return "Summary";
        } else if (elementId === "skillsTitle") {
            return "Skills";
        } else if (elementId.endsWith("Edit")) {
            return elementId.replace("Edit", "");
        }

        return null;
    }

    function openFontModal(targetElement, isContactItem = false) {
        currentTargetElement = targetElement;
        var previewElement = getPreviewElementForInput(targetElement);
        var computedStyle = previewElement
            ? getComputedStyle(previewElement) : null;

        modalFontFamily.value =
            computedStyle && computedStyle.fontFamily
                ? computedStyle.fontFamily.replace(/['"]+/g, "")
                : "Roboto";

        modalFontSize.value =
            computedStyle && computedStyle.fontSize
                ? parseInt(computedStyle.fontSize)
                : 16;
        modalFontColor.value =
            computedStyle && computedStyle.color
                ? rgbToHex(computedStyle.color)
                : "#000000";

        if (targetElement.id.endsWith("Title") && !isContactItem) {
            modalTitleBorderColorContainer.style.display = "block";
            var sectionId = "section-" + targetElement.id.replace("Title", "");
            var sectionElement = document.getElementById(sectionId);
            if (sectionElement) {
                var h2Element = sectionElement.querySelector("h2");
                modalTitleBorderColor.value =
                    rgbToHex(getComputedStyle(h2Element).borderBottomColor) ||
                    "#007bff";
            } else {
                console.error(`Section with ID "${sectionId}" not found.`);
                modalTitleBorderColor.value = "#000000";
            }
        } else {
            modalTitleBorderColorContainer.style.display = "none";
        }
        fontModal.show();
    }

    function getPreviewElementForInput(inputElement) {
        var elementId = inputElement.id;

        if (elementId === "contactName") {
            return document.getElementById("previewName");
        } else if (elementId === "contactTitle") {
            return document.getElementById("previewTitle");
        } else if (inputElement.classList.contains("contact-input")) {
            var checkbox = inputElement
                .closest(".form-group")
                .querySelector(".include-contact-item");
            if (checkbox) {
                var type = checkbox.value;
                return document.getElementById("preview" + type);
            }
        } else if (
            elementId.startsWith("degree") ||
            elementId.startsWith("institution") ||
            elementId.startsWith("year")
        ) {
            var educationItem = inputElement.closest(".education-item");
            var eduIndex = Array.from(
                document.querySelectorAll(".education-item")
            ).indexOf(educationItem);
            var previewListItems = document.querySelectorAll(
                "#previewEducation li"
            );
            var listItem = previewListItems[eduIndex];
            if (elementId.startsWith("degree")) {
                return listItem.querySelector("strong");
            } else if (elementId.startsWith("institution")) {
                return listItem.querySelectorAll("span")[0];
            } else if (elementId.startsWith("year")) {
                return listItem.querySelectorAll("span")[1];
            }
        } else if (
            elementId.startsWith("job-title") ||
            elementId.startsWith("company") ||
            elementId.startsWith("duration")
        ) {
            var experienceItem = inputElement.closest(".experience-item");
            var expIndex = Array.from(
                document.querySelectorAll(".experience-item")
            ).indexOf(experienceItem);
            var previewExperienceItems = document.querySelectorAll(
                "#previewExperience > article"
            );
            var targetDiv = previewExperienceItems[expIndex];

            if (elementId.startsWith("job-title")) {
                return targetDiv.querySelector("h5 strong");
            } else if (elementId.startsWith("company")) {
                return targetDiv.querySelector("h5 em, h5 span:last-child");
            } else if (elementId.startsWith("duration")) {
                return targetDiv.querySelector(".dates em");
            }
        } else if (
            elementId.startsWith("project-name")
        ) {
            var projectItem = inputElement.closest(".project-item");
            var projIndex = Array.from(
                document.querySelectorAll(".project-item")
            ).indexOf(projectItem);
            var previewProjectItems = document.querySelectorAll(
                "#previewProjects > div"
            );
            return previewProjectItems[projIndex].querySelector("h5");
        } else if (
            elementId.endsWith("Edit")
        ) {
            var sectionTitleId = elementId.replace("Edit", "");
            return document.getElementById(sectionTitleId);
        } else if (elementId.endsWith("Title")) {
            var sectionId = "section-" + elementId.replace("Title", "");
            var sectionElement = document.getElementById(sectionId);
            if (sectionElement) {
                return sectionElement.querySelector("h2");
            }
        }
        return null;
    }

    function rgbToHex(rgb) {
        var result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
        return result
            ? "#" +
            ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
            ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
            ("0" + parseInt(result[3], 10).toString(16)).slice(-2)
            : null;
    }

    modalFontFamily.addEventListener("change", function () {
        if (this.value === "custom") {
            modalCustomFontInput.style.display = "block";
        } else {
            modalCustomFontInput.style.display = "none";
        }
    });

    // Apply Font Changes from Modal
    document
        .getElementById("applyFontChangesBtn")
        .addEventListener("click", function () {
            var fontFamily =
                modalFontFamily.value === "custom"
                    ? modalCustomFontInput.value
                    : modalFontFamily.value;
            var fontSize = modalFontSize.value + "px";
            var color = modalFontColor.value;
            var borderColor = modalTitleBorderColor.value;

            if (currentTargetElement) {
                var previewElement =
                    getPreviewElementForInput(currentTargetElement);

                if (previewElement) {
                    previewElement.style.fontFamily = fontFamily;
                    previewElement.style.fontSize = fontSize;
                    previewElement.style.color = color;

                    elementStyles[currentTargetElement.id] = {
                        fontFamily: fontFamily,
                        fontSize: fontSize,
                        color: color,
                    };

                    if (currentTargetElement.id.endsWith("Title")) {
                        var sectionId =
                            "section-" + currentTargetElement.id.replace("Title", "");
                        var sectionElement = document.getElementById(sectionId);
                        if (sectionElement) {
                            sectionElement.querySelector("h2").style.borderBottomColor =
                                borderColor;
                            elementStyles[currentTargetElement.id].borderColor =
                                borderColor;
                        }
                    }

                    if (currentTargetElement.classList.contains("contact-input")) {
                        var checkbox = currentTargetElement
                            .closest(".form-group")
                            .querySelector(".include-contact-item");
                        if (checkbox) {
                            var type = checkbox.value;
                            contactData[type] = {
                                fontFamily: fontFamily,
                                fontSize: fontSize,
                                color: color,
                            };
                        }
                    }
                }
            }
            fontModal.hide();
        });

    addEditButton("contactName");
    addEditButton("contactTitle");
    addEditButton("summaryTitle");
    addEditButton("educationTitle");
    addEditButton("experienceTitle");
    addEditButton("skillsTitle");
    addEditButton("projectsTitle");

    document.querySelectorAll(".contact-input").forEach(function (input) {
        addEditButton(input.id, true);
    });

    addEditButton("degree-0");
    addEditButton("institution-0");
    addEditButton("year-0");

    addEditButton("job-title-0");
    addEditButton("company-0");
    addEditButton("duration-0");

    addEditButton("project-name-0");


    let newSectionCounter = {}; // Counter to keep track of sections with the same title

    // --- Add New Section Functionality ---
    document
        .getElementById("addNewSectionBtn")
        .addEventListener("click", function () {
            var title = document.getElementById("newSectionTitle").value.trim();
            var content = newSectionEditors[0].getContents();
            var newSectionLineHeight = document.getElementById("newSectionLineHeight").value;

            if (title !== "") {
                // --- Create unique ID for the new section ---
                if (!newSectionCounter[title]) {
                    newSectionCounter[title] = 0;
                }
                newSectionCounter[title]++;
                var sectionCount = newSectionCounter[title];
                var newSectionId = `section-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${sectionCount}`;
                // ---------------------------------------------

                var newSectionTitleId = title.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + sectionCount + "SectionTitle";
                var newToolbarId = `${newSectionId}-toolbar`;

                var newSection = document.createElement("section");
                newSection.classList.add("resume-section", "section");
                newSection.id = newSectionId;
                newSection.innerHTML = `<h2 id="${newSectionTitleId}" class="new-section-title">${title}</h2>
<div class="preview-new-section"></div>`;
                document.getElementById("resumePreview").appendChild(newSection);
                addNewSectionToControlPanel(
                    title,
                    newSectionId,
                    newSectionTitleId,
                    content,
                    newSectionLineHeight
                );
                document.getElementById("newSectionTitle").value = "";
                newSectionEditors[0].setText("");

                Sortable.get(document.getElementById('resumePreview')).option('draggable', '.section, .resume-header, #' + newSectionId);

                applyLineHeightToSection(newSectionId, newSectionLineHeight); // Apply line height to the new section
            }
        });

    function addNewSectionToControlPanel(
        title,
        newSectionId,
        newSectionTitleId,
        content,
        newSectionLineHeight
    ) {
        var accordion = document.getElementById("resumeAccordion");
        var newToolbarId = `${newSectionId}-toolbar`;
        var newId = "heading" + newSectionId;

        var newAccordionItem = document.createElement("div");
        newAccordionItem.classList.add("accordion-item");

        accordion.appendChild(newAccordionItem);
        newAccordionItem.innerHTML = `
<h2 class="accordion-header" id="${newId}">
    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${newSectionId}" aria-expanded="false" aria-controls="collapse${newSectionId}">
        <i class="bi bi-folder-fill me-2" aria-hidden="true"></i> ${title}
    </button>
</h2>
<div id="collapse${newSectionId}" class="accordion-collapse collapse" aria-labelledby="${newId}" data-bs-parent="#resumeAccordion">
    <div class="accordion-body">
        <div class="floating-label-container">
            <input type="text" class="form-control" id="${newSectionTitleId}Edit" placeholder="Section Title" value="${title}" required>
            <label for="${newSectionTitleId}Edit" class="form-label">Section Title</label>
        </div>
        <div class="mb-3">
            <label class="form-label">Content</label>
            <div class="ql-toolbar ql-new-section-toolbar new-section-toolbar ${newToolbarId}" id="${newToolbarId}">
                <!-- Toolbar Buttons -->
                <select class="ql-font">
                    <option value="arial" selected>Arial</option>
                    <option value="calibri">Calibri</option>
                    <option value="georgia">Georgia</option>
                    <option value="tahoma">Tahoma</option>
                    <option value="times-new-roman">Times New Roman</option>
                    <option value="verdana">Verdana</option>
                    <option value="roboto">Roboto</option>
                    <option value="montserrat">Montserrat</option>
                    <option value="open-sans">Open Sans</option>
                    <option value="raleway">Raleway</option>
                    <option value="lato">Lato</option>
                </select>
                <select class="ql-size">
                    <option value="small"></option>
                    <option selected></option>
                    <option value="large"></option>
                    <option value="huge"></option>
                </select>
                <button class="ql-bold"></button>
                <button class="ql-italic"></button>
                <button class="ql-underline"></button>
                <button class="ql-strike"></button>
                <select class="ql-color"></select>
                <select class="ql-background"></select>
                <select class="ql-align">
                    <option selected></option>
                    <option value="center"></option>
                    <option value="right"></option>
                    <option value="justify"></option>
                </select>
                <button class="ql-list" value="ordered"></button>
                <button class="ql-list" value="bullet"></button>
                <button class="ql-indent" value="-1"></button>
                <button class="ql-indent" value="+1"></button>
                <button class="ql-blockquote"></button>
                <button class="ql-code-block"></button>
                <button class="ql-direction" value="rtl"></button>
                <button class="ql-script" value="sub"></button>
                <button class="ql-script" value="super"></button>
                <select class="ql-header">
                    <option selected></option>
                    <option value="1">Heading 1</option>
                    <option value="2">Heading 2</option>
                    <option value="3">Heading 3</option>
                </select>
                <button class="ql-link"></button>
                <button class="ql-image"></button>
                <button class="ql-video"></button>
                <button class="ql-formula"></button>
                <button class="ql-clean"></button>
            </div>
            <!-- Editor Container with 'ql-container' class -->
            <div class="ql-container new-section-editor" id="${newSectionId}-editor"></div>
        </div>
        <div class="mb-3">
            <label for="${newSectionId}LineHeight" class="form-label">Line Height</label>
            <input type="range" class="form-range" min="1" max="3" step="0.1" id="${newSectionId}LineHeight" value="${newSectionLineHeight}">
            <span id="${newSectionId}LineHeightValue">${newSectionLineHeight}</span>
        </div>
        <div class="form-check mb-3">
            <input class="form-check-input toggle-section" type="checkbox" value="${newSectionId.replace("section-", "")}" id="toggle${newSectionId.replace("section-", "")}" checked>
            <label class="form-check-label" for="toggle${newSectionId.replace("section-", "")}">
                Include ${title}
            </label>
        </div>
    </div>
</div>
`;

        // Initialize Quill editor for this custom section
        let newEditor = initializeQuillEditor(
            newAccordionItem.querySelector(`#${newSectionId}-editor`),
            newAccordionItem.querySelector(`#${newToolbarId}`),
        );

        newEditor.on('editor-change', function (eventName, ...args) {
            if (eventName === 'text-change') {
                updateNewSectionPreview(newSectionId, newEditor);
                applyLineHeightToSection(newSectionId, sectionLineHeights[newSectionId]); // Apply immediately
            }
        });


        // If importing, set the content. CRITICAL!
        if (content && content.ops && content.ops.length > 0) {
            newEditor.setContents(content);

        }


        // Attach event listeners for the new section's title and toggle
        newAccordionItem.querySelector(`#${newSectionTitleId}Edit`).addEventListener("input", function () {
            document.querySelector(`#${newSectionId} h2`).textContent = this.value;
        });

        addEditButton(`${newSectionTitleId}Edit`);

        newAccordionItem.querySelector(".toggle-section").addEventListener("change", function () {
            var section = document.getElementById(newSectionId);
            if (this.checked) {
                section.style.display = "block";
            } else {
                section.style.display = "none";
            }
        });

        // Handle Line Height Slider
        var newSectionLineHeightSlider = newAccordionItem.querySelector(`#${newSectionId}LineHeight`);
        var newSectionLineHeightValue = newAccordionItem.querySelector(`#${newSectionId}LineHeightValue`);
        newSectionLineHeightSlider.addEventListener("input", function () {
            newSectionLineHeightValue.textContent = this.value;
            sectionLineHeights[newSectionId] = this.value; // Store using sectionId directly

            // Update the preview and apply the new line height
            updateNewSectionPreview(newSectionId, newEditor);
            applyLineHeightToSection(newSectionId, this.value); // Apply immediately

        });

    }


    // Function to update the preview
    function updateNewSectionPreview(sectionId, editor) {
        const previewSection = document.querySelector(`#${sectionId} .preview-new-section`);

        if (previewSection) {
            const sanitizedHTML = sanitizeQuillHTML(editor.root.innerHTML); // Sanitize
            previewSection.innerHTML = sanitizedHTML;
            // Apply styles from Quill format 
            const fontStyles = editor.getFormat();
            for (const style in fontStyles) {
                if (fontStyles[style] && previewSection.style[style] !== undefined) {
                    previewSection.style[style] = fontStyles[style];
                }
            }

        }
        // Apply line height AFTER updating content
        applyLineHeightToSection(sectionId, sectionLineHeights[sectionId]);
    }

    // --- Export Resume  ---
    document
        .getElementById("exportBtn")
        .addEventListener("click", function () {
            var preview = document
                .getElementById("resumePreview")
                .cloneNode(true);
            preview.querySelectorAll(".highlight").forEach(function (el) {
                el.classList.remove("highlight");
            });
            applyStoredStyles(preview);
            var resumeHTML = preview.innerHTML;
            var styles = `<style>
body {
font-family: Roboto, sans-serif;
font-size: 16px;
color: #333333;
padding: 20px;
background-color: #f4f6f9;
}
.draggable-photo {
width: 150px;
height: 150px;
border-radius: 50%;
object-fit: cover;
box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.resume-header {
display: flex;
align-items: center;
margin-bottom: 30px;
flex-wrap: wrap;
}
.resume-header.left .photo, .resume-header.right .photo {
margin-right: 20px;
}
.resume-header.right {
flex-direction: row-reverse;
}
.resume-header.right .photo {
margin-left: 20px;
margin-right: 0;
}
.resume-header.center {
flex-direction: column;
align-items: center;
}
.resume-header.center .photo {
margin-left: auto;
margin-right: auto;
margin-bottom: 20px;
}
.resume-header .photo {
flex-shrink: 0;
}
.resume-header .contact-info {
flex-grow: 1;
text-align: left;
}
.resume-header .contact-info h1 {
margin: 0;
font-size: 2.2rem;
font-weight: 700;
}
.resume-header .contact-info h2 {
margin: 0;
font-size: 1.3rem;
font-weight: 400;
color: #555555;
}
.resume-header .contact-info p {
margin: 5px 0;
font-size: 0.9rem;
color: #555555;
}
.resume-header .contact-info.inline p {
display: inline-block;
margin-right: 15px;
}
.resume-section h2 {
border-bottom: 2px solid #007bff;
padding-bottom: 5px;
margin-bottom: 15px;
color: #007bff;
font-size: 1.5rem;
font-weight: 700;
}
.resume-section ul, .resume-section ol {
padding-left: 20px;
font-size: 0.9rem;
}
.resume-section li {
margin-bottom: 10px;
line-height: 1.6;
}
.dates {
display: block;
text-align: right;
white-space: nowrap;
}
/* Quill Font Mappings */
.ql-font-arial {
font-family: Arial, Helvetica, sans-serif; }
.ql-font-calibri { font-family: Calibri, sans-serif; }
.ql-font-georgia { font-family: Georgia, serif; }
.ql-font-tahoma { font-family: Tahoma, Geneva, sans-serif; }
.ql-font-times-new-roman { font-family: 'Times New Roman', Times, serif; }
.ql-font-verdana { font-family: Verdana, Geneva, sans-serif; }

/* Additional fonts */
.ql-font-roboto { font-family: 'Roboto', sans-serif; }
.ql-font-montserrat { font-family: 'Montserrat', sans-serif; }
.ql-font-open-sans { font-family: 'Open Sans', sans-serif; }
.ql-font-raleway { font-family: 'Raleway', sans-serif; }
.ql-font-lato { font-family: 'Lato', sans-serif; }
/* RTL and Alignment Classes */
.ql-align-center { text-align: center !important; }
.ql-align-justify { text-align: justify !important; }
.ql-align-right { text-align: right !important; }
.ql-direction-rtl { direction: rtl !important; }
.ql-indent-1 {
            padding-left: 20px;
        }

        .ql-indent-2 {
            padding-left: 40px;
        }

        .ql-indent-3 {
            padding-left: 60px;
        }

        .ql-indent-4 {
            padding-left: 80px;
        }

        .ql-indent-5 {
            padding-left: 90px;
        }

        .ql-indent-6 {
            padding-left: 100px;
        }

        .ql-indent-7 {
            padding-left: 110px;
        }

        .ql-indent-8 {
            padding-left: 120px;
        }

        /* Blockquote Styling */
        .live-resume-preview blockquote {
            margin: 1em 0;
            /* Add vertical spacing */
            padding-left: 20px;
            /* Indentation */
            border-left: 4px solid #ccc;
            /* Left border for visual emphasis */
            color: #555;
            /* Subtle text color */
            font-style: italic;
            /* Italicize the text */
            background-color: #f9f9f9;
            /* Light background for emphasis */
        }

        /* Code Block Styling */
        .live-resume-preview .ql-code-block {
            background-color: #f4f4f4;
            /* Light grey background */
            border-left: 4px solid #007acc;
            /* Accent color border */
            color: #333;
            /* Darker text color for better readability */
            font-family: 'Courier New', Courier, monospace;
            /* Monospace font for code */
            padding: 10px 15px;
            /* Padding inside the block */
            margin: 1em 0;
            /* Vertical spacing between blocks */
            white-space: pre;
            /* Preserve whitespace */
            overflow-x: auto;
            /* Allow horizontal scrolling for long lines */
            font-size: 0.9em;
            /* Slightly smaller font size for distinction */
            line-height: 1.5;
            /* Better line spacing */
        }
</style>`;
            var htmlContent = `<!DOCTYPE html>

<html>
<head>
<meta charset="UTF-8">
<title>Resume</title>
${styles}
<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
${resumeHTML}
<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"><\/script>
</body>
</html>`;
            var blob = new Blob([htmlContent], {
                type: "text/html",
            });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "resume.html";
            a.click();
            URL.revokeObjectURL(url);
        });

    function applyStoredStyles(element) {
        if (element.nodeType === Node.ELEMENT_NODE) {
            var elementId = element.id;

            // Apply line height if stored for the element
            if (sectionLineHeights[elementId]) {
                element.style.lineHeight = sectionLineHeights[elementId];
            }
            if (elementStyles[elementId]) {
                var styles = elementStyles[elementId];
                for (var prop in styles) {
                    element.style[prop] = styles[prop];
                }
            }
            if (elementId.endsWith("LineHeight")) {
                var sectionId = elementId.replace("LineHeight", "");
                var previewElement = document.querySelector(
                    `#${sectionId} .preview-new-section`
                );
                if (previewElement) {
                    previewElement.style.lineHeight =
                        elementStyles[elementId].lineHeight;
                }
            }
            for (var i = 0; i < element.childNodes.length; i++) {
                applyStoredStyles(element.childNodes[i]);
            }
        }
    }

    function adjustFloatingLabels() {
        const containers = document.querySelectorAll('.floating-label-container');
        containers.forEach(container => {
            const input = container.querySelector('input, textarea, select');
            const label = container.querySelector('label');
            if (input.value || input.placeholder) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });
    }

    adjustFloatingLabels();
    window.addEventListener('resize', adjustFloatingLabels);

    // --- Import Resume Functionality ---
    document.getElementById("importBtn").addEventListener("click", function () {
        document.getElementById("importFile").click();
    });

    document.getElementById("importFile").addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const htmlContent = e.target.result;
                parseAndLoadHTML(htmlContent); // Call the parsing function
            };
            reader.readAsText(file);
        }
    });


    function parseAndLoadHTML(htmlContent) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, "text/html");

            // --- Photo Import ---
            const photoElement = doc.querySelector("#resumePhoto");
            if (photoElement && photoElement.src) {
                document.getElementById("resumePhoto").src = photoElement.src;
                document.getElementById("resumePhotoContainer").style.display = "block";
                photo.src = photoElement.src;  // Set photo.src, so it displays on export
                document.getElementById('togglePhoto').checked = true; // Ensure photo is included
                document.querySelector(`#section-photo`).style.display = "flex"; // Ensure photo section is visible
            }

            // --- Contact Info ---
            document.getElementById("contactName").value = doc.getElementById("previewName")?.textContent || "";
            document.getElementById("contactTitle").value = doc.getElementById("previewTitle")?.textContent || "";


            // --- Email, Phone, LinkedIn, Website ---
            const previewContactInfo = doc.getElementById("previewContactInfo");

            // Initialize a counter for "other" contact types
            let otherContactCounterImported = 0;
            let importedContactItems = []; // Array to store imported items temporarily


            if (previewContactInfo) {
                const contactItems = previewContactInfo.querySelectorAll("p, a");
                contactItems.forEach(item => {
                    let type = item.id?.replace("preview", "") || "";
                    let value = "";
                    let link = "";

                    if (item.tagName === 'A') {
                        value = item.textContent || "";
                        link = item.href || "";
                    } else { // It's a <p> tag (no link)
                        value = item.textContent || "";
                    }

                    importedContactItems.push({ type, value, link }); // Store items

                });
            }


            // --- NOW process the imported items: ---

            // Iterate over the importedContactItems using a for loop
            for (let i = 0; i < importedContactItems.length; i++) {
                let item = importedContactItems[i];
                let { type, value, link } = item;

                // Initialize a variable to hold the link (if any)
                let associatedLink = '';

                // Check if the current item has a relevant type
                if (type === "" || type === "email" || type === "phone" || type === "linkedin" || type === "website") {
                    // If type is empty, it's likely a link without a main type, skip processing
                    if (type === "") {
                        continue;
                    }

                    // Check if the next item exists and has type ''
                    if (i + 1 < importedContactItems.length && importedContactItems[i + 1].type === "") {
                        associatedLink = importedContactItems[i + 1].link;
                        i++; // Skip the next item as it's already processed
                    }

                    // Correct the type formatting
                    const correctedType = type === "linkedin" ? "LinkedIn" : type.charAt(0).toUpperCase() + type.slice(1);

                    // Get the input fields and checkbox based on the corrected type
                    const inputField = document.getElementById(`contact${correctedType}`);
                    const linkInputField = document.getElementById(`link${correctedType}`); // Correct ID for link field
                    const checkbox = document.getElementById(`include${correctedType}`);

                    if (inputField) {
                        inputField.value = value;

                        if (linkInputField) {
                            // Assign the associated link if available, otherwise use the current link
                            linkInputField.value = associatedLink || link;
                        }

                        if (checkbox) checkbox.checked = true;
                        inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    }

                } else { // Handle other contact items (e.g., 'other0', 'other1', etc.)
                    // Check if the next item exists and has type ''
                    if (i + 1 < importedContactItems.length && importedContactItems[i + 1].type === "") {
                        associatedLink = importedContactItems[i + 1].link;
                        i++; // Skip the next item as it's already processed
                    }

                    // Assign a unique type for "other" contacts
                    let uniqueType = "other" + otherContactCounterImported++;

                    // Simulate clicking the "Add Contact Item" button to create a new contact input
                    document.getElementById("addContactItem").click();

                    // Get the newly added contact item container
                    const newContactItem = document.getElementById("contactItemsContainer").lastElementChild;

                    // Select the input elements within the new contact item
                    const newInput = newContactItem.querySelector(".contact-input");
                    const newLinkInput = newContactItem.querySelector(".contact-link"); // Select the link input
                    const newCheckbox = newContactItem.querySelector(".include-contact-item");

                    // Set IDs and values for the new input fields
                    newInput.id = `contact${uniqueType}`;
                    newInput.value = value;

                    newLinkInput.id = `link${uniqueType}`;  // Set ID for the link input
                    newLinkInput.value = associatedLink || link; // Apply the extracted link or existing link

                    newCheckbox.id = `include${uniqueType}`;
                    newCheckbox.value = uniqueType;
                    newCheckbox.checked = true;

                    // Dispatch an input event to notify any listeners of the change
                    newInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }



            // Trigger input events *AFTER* processing all items
            document.querySelectorAll('.contact-input, .contact-link').forEach(input => {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });


            // --- Summary ---
            const summaryHTML = doc.getElementById("previewSummary")?.innerHTML || "";
            summaryEditor.clipboard.dangerouslyPasteHTML(0, summaryHTML);  // Use clipboard for Summary
            document.getElementById("summaryTitle").value = doc.getElementById("summarySectionTitle")?.textContent || "Summary";


            // --- Education ---
            const educationItems = doc.querySelectorAll("#previewEducation li");
            // Clear existing education items in the control panel
            document.getElementById("educationList").innerHTML = "";
            educationCounter = 0; // Reset the counter
            if (educationItems) {
                educationItems.forEach((item, index) => {
                    // Add new education item to control panel dynamically
                    document.getElementById("addEducation").click();
                    const degree = item.querySelector("strong")?.textContent || "";
                    const institution = item.querySelectorAll("span")[0]?.textContent || "";
                    const year = item.querySelectorAll("span")[1]?.textContent || "";

                    document.getElementById(`degree-${index}`).value = degree;
                    document.getElementById(`institution-${index}`).value = institution;
                    document.getElementById(`year-${index}`).value = year;

                });
                updateEducationPreview();// Trigger update AFTER adding to control panel
            }
            document.getElementById("educationTitle").value = doc.getElementById("educationSectionTitle")?.textContent || "Education";
            // Trigger the toggle to show education section
            document.getElementById("toggleEducation").checked = true;
            document.getElementById("toggleEducation").dispatchEvent(new Event('change'));



            // --- Experience ---
            const experienceItems = doc.querySelectorAll("#previewExperience article");
            document.getElementById("experienceList").innerHTML = ""; // Clear existing experiences
            experienceCounter = 0; // Reset the counter
            experienceEditors = []; // Reset the editors array

            // Convert NodeList to Array for easier manipulation and async handling
            const experienceItemsArray = Array.from(experienceItems);

            // Use Promise.all to handle asynchronous operations correctly
            Promise.all(experienceItemsArray.map((item, index) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        document.getElementById("addExperience").click(); // Add item to control panel
                        const currentIndex = experienceCounter - 1; // Get correct index

                        const jobTitle = item.querySelector("strong")?.textContent || "";
                        const company = item.querySelector("h6 > em, h6 > span:not(.dates)")?.textContent || "";
                        const duration = item.querySelector(".dates span, .dates em, .dates p span")?.textContent || "";
                        const descriptionHTML = item.querySelector(".preview-experience-description")?.innerHTML || "";

                        document.getElementById(`job-title-${currentIndex}`).value = jobTitle;
                        document.getElementById(`company-${currentIndex}`).value = company;
                        document.getElementById(`duration-${currentIndex}`).value = duration;

                        // Wait for the editor to be fully initialized before setting content
                        const editorContainer = document.getElementById(`experience-description-editor-${currentIndex}`);

                        // Function to check if editor is ready and set its content
                        function setEditorContentWhenReady(editor, content) {
                            if (editor) { //Make sure it is there and initiaized before setting content
                                editor.clipboard.dangerouslyPasteHTML(0, content);
                                resolve(); // Resolve the promise when the content is set
                                return;
                            }
                            setTimeout(() => setEditorContentWhenReady(experienceEditors[currentIndex], content), 50); // Check again after 50ms
                        }

                        setEditorContentWhenReady(experienceEditors[currentIndex], descriptionHTML);


                    }, 0); // 0 delay to ensure DOM updates
                });
            }))
                .then(() => {
                    updateExperiencePreview(); // Update preview *after* all promises resolve
                });


            // --- Skills ---
            const skillsPreview = doc.getElementById("previewSkills");
            if (skillsPreview) {
                const skillsList = document.getElementById("skillsList");
                skillsList.innerHTML = ""; // Clear existing skills
                if (skillsPreview.querySelector("ul")) { // It's a list
                    document.getElementById("skillsList").checked = true; // Select the "List" radio button
                    const skillItems = skillsPreview.querySelectorAll("li");
                    skillItems.forEach(item => {
                        document.getElementById("skillsInput").value = item.textContent;
                        document.getElementById("addSkill").click();
                    });
                } else if (skillsPreview.querySelector("table")) {  // It's a table
                    document.getElementById("skillsTable").checked = true;// Select the "Table" radio button
                    const skillItems = skillsPreview.querySelectorAll("td");
                    skillItems.forEach(item => {
                        document.getElementById("skillsInput").value = item.textContent;
                        document.getElementById("addSkill").click();
                    });

                    // Import table column count if available:
                    const numColumns = skillsPreview.querySelector("table")?.rows[0]?.cells?.length;
                    if (numColumns) {
                        document.getElementById("tableColumnCount").value = numColumns;
                    }

                }

            }

            document.getElementById("skillsTitle").value = doc.getElementById("skillsSectionTitle")?.textContent || "Skills";



            // --- Projects ---
            const projectsList = doc.getElementById("previewProjects");
            if (projectsList) {
                const projectItems = Array.from(projectsList.querySelectorAll(".itemProj"));
                //Clear existing experiences
                document.getElementById("projectsList").innerHTML = "";
                projectCounter = 0; // Reset the counter
                projectEditors = []; // Reset the editors array

                //Iterate through the imported project items
                projectItems.forEach((item, index) => {
                    document.getElementById("addProject").click(); // Add a new project item
                    const currentIndex = projectCounter - 1; // Get the correct index

                    const projectName = item.querySelector("h6 strong")?.textContent || "";
                    const projectDescription = item.querySelector(".preview-project-description")?.innerHTML || "";

                    document.getElementById(`project-name-${currentIndex}`).value = projectName;


                    const editorContainer = document.getElementById(`project-description-editor-${currentIndex}`);
                    if (editorContainer) {
                        const editor = projectEditors[currentIndex]; // Access the existing editor
                        if (editor) {
                            editor.clipboard.dangerouslyPasteHTML(0, projectDescription);
                        }
                    }
                });

                updateProjectsPreview(); // Update preview after populating all items
            }
            document.getElementById("projectsTitle").value = doc.getElementById("projectsSectionTitle")?.textContent || "Projects";



            // --- Custom/New Sections ---
            const customSections = doc.querySelectorAll('.resume-section:not([data-section])');
            customSections.forEach((section, customIndex) => {
                const title = section.querySelector('h2')?.textContent || "";
                const content = section.querySelector('div')?.innerHTML || "";
                let lineHeight = "1.6";

                document.getElementById("newSectionTitle").value = title;

                //Add new Section and wait for it to be created:
                document.getElementById("addNewSectionBtn").click();



                //Use setTimeout to ensure the editor and section are fully initialized
                setTimeout(() => {

                    const newSectionId = `section-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${newSectionCounter[title]}`;
                    const newSectionEditorContainer = document.getElementById(`${newSectionId}-editor`);
                    const newSectionPreview = document.getElementById(newSectionId).querySelector(".preview-new-section");
                    var newSectionLineHeight = document.getElementById(`${newSectionId}LineHeight`).value;
                    var newSectionLineHeightSlider = document.querySelector(`#${newSectionId}LineHeight`);
                    var newSectionLineHeightValue = document.querySelector(`#${newSectionId}LineHeightValue`);


                    if (newSectionEditorContainer) {
                        // Create a new Quill editor for the custom section to handle formatting
                        // Use the consistent initialization function
                        let customEditor = initializeQuillEditor(
                            newSectionEditorContainer,
                            document.getElementById(`${newSectionId}-toolbar`)
                        );


                        customEditor.clipboard.dangerouslyPasteHTML(0, content);
                        updateNewSectionPreview(newSectionId, customEditor, lineHeight);
                        newSectionLineHeightSlider.addEventListener("input", function () {
                            newSectionLineHeightValue.textContent = this.value;
                            newSectionLineHeight = this.value;

                            // Update the preview with the new line height
                            updateNewSectionPreview(newSectionId, customEditor, newSectionLineHeight);

                            elementStyles[newSectionId + "LineHeight"] = {
                                lineHeight: this.value,
                            };
                        });
                        customEditor.on('text-change', function () {
                            updateNewSectionPreview(newSectionId, customEditor, newSectionLineHeight);
                        });
                    }

                }, 0);

            });


            // Trigger input events for contact items (Important: We do this *after* setting values)
            document.querySelectorAll('.contact-input, .contact-link').forEach(input => {
                input.dispatchEvent(new Event('input', { bubbles: true })); // Bubbles: true is crucial
            });



            // Call update functions after adding all the sections
            updateExperiencePreview();
            updateSkillsPreview();
            updateProjectsPreview();

            // Trigger input events to update the preview
            document.getElementById("contactName").dispatchEvent(new Event('input'));
            document.getElementById("contactTitle").dispatchEvent(new Event('input'));
            document.getElementById("summaryTitle").dispatchEvent(new Event('input'));
            document.getElementById("educationTitle").dispatchEvent(new Event('input'));
            document.getElementById("experienceTitle").dispatchEvent(new Event('input'));
            document.getElementById("skillsTitle").dispatchEvent(new Event('input'));
            document.getElementById("projectsTitle").dispatchEvent(new Event('input'));


        } catch (error) {
            console.error("Error parsing HTML:", error);
            alert("Invalid resume file. Please import a valid HTML resume.");
        }

    }

});
