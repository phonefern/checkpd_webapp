"use client";

import React, { useState } from 'react';

const DataSheetForm: React.FC = () => {
    // State for form data
    const [formData, setFormData] = useState({
        // PD section
        pdType: '',
        diseaseDuration: '',
        hyStage: '',

        // Prodromal/High Risk section
        suspectedRbd: false,
        rbdAgeOnset: '',
        rbdDuration: '',
        hyposmia: false,
        hyposmiaAgeOnset: '',
        hyposmiaDuration: '',

        // Symptoms
        constipation: false,
        constipationAgeOnset: '',
        constipationDuration: '',
        depression: false,
        depressionAgeOnset: '',
        depressionDuration: '',
        excessiveSleepiness: false,
        edsAgeOnset: '',
        edsDuration: '',
        autonomicDysfunction: false,
        ansDysfunctionAgeOnset: '',
        ansDysfunctionDuration: '',
        mildParkinsonianSign: false,
        familyHistoryPd: false,
        otherDiagnosis: '',
        healthy: false,

        // Personal information
        firstName: '',
        lastName: '',
        age: '',
        province: '',
        collectionDate: '',
        hnNumber: '',
        weight: '',
        height: '',
        bmi: '',
        chestCircumference: '',
        waistCircumference: '',
        neckCircumference: '',
        hipCircumference: '',
        bpSupine: '',
        prSupine: '',
        bpUpright: '',
        prUpright: '',

        // Check PD application
        demographic: false,
        questions20: false,
        voiceAnalysis: false,
        tremorTest: false,
        fingerTapping: false,
        pinchToSize: false,
        gaitBalance: false,

        // MDS UPDRS
        part1: '',
        part2: '',
        part3: '',
        part4: '',
        totalMdsUpdrs: '',

        // Cognitive test
        moca: '',
        tmse: '',

        // Smell test
        thaiSmellTest: '',
        sniffinStickTest: '',

        // Color discrimination
        colorTestPaper: false,
        colorTestApp: false,
        rightEye1Paper: '',
        rightEye2Paper: '',
        leftEye1Paper: '',
        leftEye2Paper: '',
        rightEye1App: '',
        rightEye2App: '',
        leftEye1App: '',
        leftEye2App: '',

        // Contrast discrimination
        contrastTestManual: false,
        contrastTestApp: false,
        rightEyeManual: '',
        leftEyeManual: '',
        rightEyeApp: '',
        leftEyeApp: '',

        // VA
        rightEye: '',
        rightEyePinhole: '',
        leftEye: '',
        leftEyePinhole: '',

        // Sleep domain
        rbdQuestionnaire: '',
        ess: '',
        psgRequest: false,
        psgRequestDate: '',

        // Behavioral/psychiatric domain
        hamd: '',

        // Constipation
        romeIv: '',

        // ADLs Questionnaire
        adls: '',

        // SCOPA AUT
        scopaAut: '',

        // Blood test
        geneticTestGp2: false,
        serumRtQuic: false,

        // FDOPA PET scan
        petScanRequest: false,
        petScanRequestDate: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(formData);
        // Here you would typically send the data to your backend
        alert('Form submitted successfully!');
    };

    return (
        <div className="p-6 bg-white rounded shadow-md max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-center">Data sheet for high risk or suspected Prodromal PD and PD</h1>
            <p className="text-center mb-6">(Check PD: National Screening Project)</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* PD Section */}
                <div className="border p-4 rounded">
                    <h2 className="text-xl font-semibold mb-4">PD</h2>
                    <div className="space-y-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="newlyDiagnosed"
                                checked={formData.pdType === 'new'}
                                onChange={() => setFormData({ ...formData, pdType: formData.pdType === 'new' ? '' : 'new' })}
                                className="mr-2"
                            />
                            Newly diagnosis
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="pd"
                                checked={formData.pdType === 'pd'}
                                onChange={() => setFormData({ ...formData, pdType: formData.pdType === 'pd' ? '' : 'pd' })}
                                className="mr-2"
                            />
                            PD
                        </label>
                        {formData.pdType === 'pd' && (
                            <div className="ml-6 space-y-2">
                                <div className="flex items-center">
                                    <span className="w-48">Disease duration</span>
                                    <input
                                        type="text"
                                        name="diseaseDuration"
                                        value={formData.diseaseDuration}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-20"
                                    />
                                    <span className="ml-2">years</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="w-48">H&Y</span>
                                    <input
                                        type="text"
                                        name="hyStage"
                                        value={formData.hyStage}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-20"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prodromal / High Risk Section */}
                <div className="border p-4 rounded">
                    <h2 className="text-xl font-semibold mb-4">Prodromal / High Risk</h2>
                    <p className="mb-4">กรณีมีข้อใดข้อหนึ่งดังต่อไปนี้</p>

                    <div className="space-y-4">
                        {/* Suspected RBD */}
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="suspectedRbd"
                                    checked={formData.suspectedRbd}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                <span className="font-semibold">Suspected RBD</span>: History of acting out of dream or vocalization or RBDQ ≥ 17 or PSG confirmed
                            </label>
                            {formData.suspectedRbd && (
                                <div className="ml-6 mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-64">อายุที่เริ่มมีอาการนอนละเมอ</span>
                                        <input
                                            type="text"
                                            name="rbdAgeOnset"
                                            value={formData.rbdAgeOnset}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20"
                                        />
                                        <span className="ml-2">ปี</span>
                                        <span className="ml-4">หรือ มีอาการนอนละเมอมานานเท่าไหร่</span>
                                        <input
                                            type="text"
                                            name="rbdDuration"
                                            value={formData.rbdDuration}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20 ml-2"
                                        />
                                        <span className="ml-2">ปี</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hyposmia */}
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="hyposmia"
                                    checked={formData.hyposmia}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                <span className="font-semibold">Hyposmia</span>: History ได้รับกลิ่นลดลง และ Sniffins' stick ≤ 9
                            </label>
                            {formData.hyposmia && (
                                <div className="ml-6 mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-64">อายุที่เริ่มมีอาการจมูกได้กลิ่นลดลง</span>
                                        <input
                                            type="text"
                                            name="hyposmiaAgeOnset"
                                            value={formData.hyposmiaAgeOnset}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20"
                                        />
                                        <span className="ml-2">ปี</span>
                                        <span className="ml-4">หรือ มีอาการจมูกได้กลิ่นลดลงมานานเท่าไหร่</span>
                                        <input
                                            type="text"
                                            name="hyposmiaDuration"
                                            value={formData.hyposmiaDuration}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20 ml-2"
                                        />
                                        <span className="ml-2">ปี</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="font-semibold">หรือ มีอาการนำ อย่างน้อย 2 ข้อจากอาการดังต่อไปนี้</p>

                        {/* Constipation */}
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="constipation"
                                    checked={formData.constipation}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                <span className="font-semibold">Constipation</span>: History ถ่ายอุจจาระ ความถี่นานกว่าวันเว้นวัน หรือต้องใช้ยาระบาย หรือ ลักษณะอุจจาระแข็งขึ้น เรื้อรังในช่วง 3 เดือนที่ผ่านมา เมื่อเทียบกับก่อนหน้า or ROME IV ≥ 2
                            </label>
                            {formData.constipation && (
                                <div className="ml-6 mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-64">อายุที่เริ่มมีอาการท้องผูก</span>
                                        <input
                                            type="text"
                                            name="constipationAgeOnset"
                                            value={formData.constipationAgeOnset}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20"
                                        />
                                        <span className="ml-2">ปี</span>
                                        <span className="ml-4">หรือ มีอาการท้องผูกมานานเท่าไหร่</span>
                                        <input
                                            type="text"
                                            name="constipationDuration"
                                            value={formData.constipationDuration}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20 ml-2"
                                        />
                                        <span className="ml-2">ปี</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Depression */}
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="depression"
                                    checked={formData.depression}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                <span className="font-semibold">Depression</span>: ประวัติการได้รับการวินิจฉัยและรักษา หรือ HAM-D ตั้งแต่ 13 คะแนนขึ้นไป
                            </label>
                            {formData.depression && (
                                <div className="ml-6 mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-64">อายุที่เริ่มมีอาการซึมเศร้า</span>
                                        <input
                                            type="text"
                                            name="depressionAgeOnset"
                                            value={formData.depressionAgeOnset}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20"
                                        />
                                        <span className="ml-2">ปี</span>
                                        <span className="ml-4">หรือ มีอาการซึมเศร้ามานานเท่าไหร่</span>
                                        <input
                                            type="text"
                                            name="depressionDuration"
                                            value={formData.depressionDuration}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20 ml-2"
                                        />
                                        <span className="ml-2">ปี</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Excessive daytime sleepiness */}
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="excessiveSleepiness"
                                    checked={formData.excessiveSleepiness}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                <span className="font-semibold">Excessive daytime sleepiness</span>: ง่วงนอนมากผิดปกติในช่วงกลางวัน หรือ ESS ตั้งแต่ 10 คะแนน โดยที่กลางคืนนอนหลับได้ปกติ หรือไม่มีอาการกรนหยุดหายใจ
                            </label>
                            {formData.excessiveSleepiness && (
                                <div className="ml-6 mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-64">อายุที่เริ่มมีอาการ EDS</span>
                                        <input
                                            type="text"
                                            name="edsAgeOnset"
                                            value={formData.edsAgeOnset}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20"
                                        />
                                        <span className="ml-2">ปี</span>
                                        <span className="ml-4">หรือ มีอาการ EDS มานานเท่าไหร่</span>
                                        <input
                                            type="text"
                                            name="edsDuration"
                                            value={formData.edsDuration}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20 ml-2"
                                        />
                                        <span className="ml-2">ปี</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Autonomic dysfunction */}
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="autonomicDysfunction"
                                    checked={formData.autonomicDysfunction}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />
                                <span className="font-semibold">Autonomic dysfunction</span>: มีอาการระบบประสาทอัตโนมัติผิดปกติข้อใดข้อหนึ่ง หน้ามืดหรือเป็นลมหมดสติเวลาเปลี่ยนท่าจากนอนหรือนั่งเป็นยืน, กลั้นปัสสาวะไม่อยู่, อวัยวะเพศไม่แข็งตัว
                            </label>
                            {formData.autonomicDysfunction && (
                                <div className="ml-6 mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-64">อายุที่เริ่มมีอาการ ANS dysfunction</span>
                                        <input
                                            type="text"
                                            name="ansDysfunctionAgeOnset"
                                            value={formData.ansDysfunctionAgeOnset}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20"
                                        />
                                        <span className="ml-2">ปี</span>
                                        <span className="ml-4">หรือมีอาการ ANS dysfunction มานานเท่าไหร่</span>
                                        <input
                                            type="text"
                                            name="ansDysfunctionDuration"
                                            value={formData.ansDysfunctionDuration}
                                            onChange={handleInputChange}
                                            className="border rounded p-1 w-20 ml-2"
                                        />
                                        <span className="ml-2">ปี</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mild parkinsonian sign */}
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="mildParkinsonianSign"
                                checked={formData.mildParkinsonianSign}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            <span className="font-semibold">Mild parkinsonian sign</span>: (UPDRS part III {'>'} 3 โดยไม่รวม postural and kinetic tremor หรือ total UPDRS {'>'} 6 โดยยังไม่เข้า criteria การวินิจฉัยพาร์กินสัน และไม่นับคะแนนจาก potential confounder เช่นโรคข้อ เป็นต้น)
                        </label>

                        {/* Family history of PD */}
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="familyHistoryPd"
                                checked={formData.familyHistoryPd}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            <span className="font-semibold">Family history of PD (First degree)</span>: ประวัติญาติสายตรงเป็นพาร์กินสัน
                        </label>


                    </div>
                </div>
                <div className="border p-4 rounded">
                    {/* Other diagnosis */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="otherDiagnosis"
                            checked={!!formData.otherDiagnosis}
                            onChange={(e) => setFormData({ ...formData, otherDiagnosis: e.target.checked ? '' : 'none' })}
                            className="mr-2"
                        />
                        <span className="font-semibold mr-2">Other diagnosis</span>
                        <input
                            type="text"
                            name="otherDiagnosis"
                            value={formData.otherDiagnosis === 'none' ? '' : formData.otherDiagnosis}
                            onChange={handleInputChange}
                            className="border rounded p-1 flex-grow"
                            disabled={!formData.otherDiagnosis}
                        />
                    </div>

                    {/* Healthy */}
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="healthy"
                            checked={formData.healthy}
                            onChange={handleInputChange}
                            className="mr-2"
                        />
                        <span className="font-semibold">Healthy</span>
                    </label>
                </div>

                {/* Personal Information */}
                <div className="border p-4 rounded">
                    <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2">
                                1. ชื่อ
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                นามสกุล
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                2. อายุ
                                <input
                                    type="text"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                                <span className="ml-2">ปี</span>
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                3. จังหวัด
                                <input
                                    type="text"
                                    name="province"
                                    value={formData.province}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                4. วันที่เก็บข้อมูล
                                <input
                                    type="date"
                                    name="collectionDate"
                                    value={formData.collectionDate}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                5. HN (for KCMH patients)
                                <input
                                    type="text"
                                    name="hnNumber"
                                    value={formData.hnNumber}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h3 className="font-semibold mb-2">6. วัดขนาดร่างกาย</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2">
                                    น้ำหนัก
                                    <input
                                        type="text"
                                        name="weight"
                                        value={formData.weight}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">กิโลกรัม</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    ส่วนสูง
                                    <input
                                        type="text"
                                        name="height"
                                        value={formData.height}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">เซนติเมตร</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    BMI
                                    <input
                                        type="text"
                                        name="bmi"
                                        value={formData.bmi}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">Kg/m²</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block mb-2">
                                    รอบอก
                                    <input
                                        type="text"
                                        name="chestCircumference"
                                        value={formData.chestCircumference}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">นิ้ว</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    รอบเอว
                                    <input
                                        type="text"
                                        name="waistCircumference"
                                        value={formData.waistCircumference}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">นิ้ว</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    รอบคอ
                                    <input
                                        type="text"
                                        name="neckCircumference"
                                        value={formData.neckCircumference}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">นิ้ว</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    รอบสะโพก
                                    <input
                                        type="text"
                                        name="hipCircumference"
                                        value={formData.hipCircumference}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">นิ้ว</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block mb-2">
                                    ความดันโลหิตท่านอน BP Supine
                                    <input
                                        type="text"
                                        name="bpSupine"
                                        value={formData.bpSupine}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">mmHg</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    PR
                                    <input
                                        type="text"
                                        name="prSupine"
                                        value={formData.prSupine}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">/min</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    ความดันโลหิต หลังยืน 3 นาที BP Upright 3 min
                                    <input
                                        type="text"
                                        name="bpUpright"
                                        value={formData.bpUpright}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">mmHg</span>
                                </label>
                            </div>
                            <div>
                                <label className="block mb-2">
                                    PR
                                    <input
                                        type="text"
                                        name="prUpright"
                                        value={formData.prUpright}
                                        onChange={handleInputChange}
                                        className="border rounded p-1 w-full mt-1"
                                    />
                                    <span className="ml-2">/min</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Check PD Application */}
                <div className="border p-4 rounded">
                    <h2 className="text-xl font-semibold mb-4">7. Check PD application</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="demographic"
                                checked={formData.demographic}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            Demographic
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="questions20"
                                checked={formData.questions20}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            20-questions questionnaire
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="voiceAnalysis"
                                checked={formData.voiceAnalysis}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            Voice analysis
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="tremorTest"
                                checked={formData.tremorTest}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            Tremor test
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="fingerTapping"
                                checked={formData.fingerTapping}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            Finger tapping test
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="pinchToSize"
                                checked={formData.pinchToSize}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            Pinch to size test
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="gaitBalance"
                                checked={formData.gaitBalance}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            Gait and balance testing
                        </label>
                    </div>
                </div>

                {/* MDS UPDRS */}
                <div className="border p-4 rounded">
                    <h2 className="text-xl font-semibold mb-4">8. MDS UPDRS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2">
                                Part I
                                <input
                                    type="text"
                                    name="part1"
                                    value={formData.part1}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                                <span className="ml-2">คะแนน</span>
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                Part II
                                <input
                                    type="text"
                                    name="part2"
                                    value={formData.part2}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                                <span className="ml-2">คะแนน</span>
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                Part III
                                <input
                                    type="text"
                                    name="part3"
                                    value={formData.part3}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                                <span className="ml-2">คะแนน</span>
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                Part IV
                                <input
                                    type="text"
                                    name="part4"
                                    value={formData.part4}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                                <span className="ml-2">คะแนน</span>
                            </label>
                        </div>
                        <div>
                            <label className="block mb-2">
                                Total MDS-UPDRS
                                <input
                                    type="text"
                                    name="totalMdsUpdrs"
                                    value={formData.totalMdsUpdrs}
                                    onChange={handleInputChange}
                                    className="border rounded p-1 w-full mt-1"
                                />
                                <span className="ml-2">คะแนน</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Additional sections would continue here following the same pattern */}

                <div className="mt-6">
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                    >
                        Submit Form
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DataSheetForm;