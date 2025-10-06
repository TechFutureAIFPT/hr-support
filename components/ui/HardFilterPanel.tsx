import React from 'react';
import type { HardFilters } from '../../types';

interface HardFilterPanelProps {
  hardFilters: HardFilters;
  setHardFilters: React.Dispatch<React.SetStateAction<HardFilters>>;
}

const HardFilterPanel: React.FC<HardFilterPanelProps> = ({ hardFilters, setHardFilters }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setHardFilters(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleMandatoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    setHardFilters(prev => ({
      ...prev,
      [id]: checked
    }));
  };
  
  const inputClasses = (isMandatory: boolean, hasValue: boolean) => 
    `hf-control w-full bg-slate-800/80 border rounded-lg p-2.5 text-sm focus:ring-2 focus:border-blue-500 transition-all ${
      isMandatory && !hasValue ? 'border-red-500/80 ring-2 ring-red-500/30' : 'border-slate-600 focus:ring-blue-500'
    }`;


  return (
    <div className="h-full flex flex-col filters-panel">
      <div className="mb-6">
        <h3 className="font-bold bg-gradient-to-r from-red-400 via-orange-500 to-yellow-400 text-transparent bg-clip-text text-lg flex items-center gap-3">
            <i className="fa-solid fa-filter text-red-400 text-xl"></i>
            Tiêu chí Lọc
        </h3>
      </div>

            <div className="flex-1 space-y-3 filters-fields-vertical">
                {/* Location */}
        <div className={`p-3 rounded-lg border transition-all duration-200 field block-field ${hardFilters.locationMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}>
            <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="location" className={`text-sm font-semibold transition-colors ${hardFilters.locationMandatory ? 'text-blue-300' : 'text-blue-200'}`}>
                    Địa điểm {hardFilters.locationMandatory && <span className="text-red-400">*</span>}
                </label>
                <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="locationMandatory" className="flex items-center cursor-pointer">
                    <input type="checkbox" id="locationMandatory" checked={hardFilters.locationMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-600 focus:ring-offset-slate-800"/>
                </label>
            </div>
            <select id="location" value={hardFilters.location} onChange={handleChange} className={inputClasses(hardFilters.locationMandatory, !!hardFilters.location) + ' hf-control'}>
                <option value="">-- Bắt buộc chọn --</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Hải Phòng">Hải Phòng</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Thành phố Hồ Chí Minh">Thành phố Hồ Chí Minh</option>
                <option value="Remote">Remote</option>
            </select>
        </div>

       {/* Experience */}
           <div className={`p-3 rounded-lg border transition-all duration-200 field block-field ${hardFilters.minExpMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}>
                <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="minExp" className={`text-sm font-semibold transition-colors ${hardFilters.minExpMandatory ? 'text-emerald-300' : 'text-emerald-200'}`}>
                        Kinh nghiệm {hardFilters.minExpMandatory && <span className="text-red-400">*</span>}
                    </label>
                    <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="minExpMandatory" className="flex items-center cursor-pointer">
                        <input type="checkbox" id="minExpMandatory" checked={hardFilters.minExpMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-emerald-500 bg-slate-700 border-slate-600 rounded focus:ring-emerald-600 focus:ring-offset-slate-800"/>
                    </label>
                </div>
                <select id="minExp" value={hardFilters.minExp} onChange={handleChange} className={inputClasses(hardFilters.minExpMandatory, !!hardFilters.minExp) + ' hf-control'}>
                    <option value="">-- Không yêu cầu --</option>
                    <option value="1">≥ 1 năm</option>
                    <option value="2">≥ 2 năm</option>
                    <option value="3">≥ 3 năm</option>
                    <option value="5">≥ 5 năm</option>
                </select>
            </div>
            <div className={`p-3 rounded-lg border transition-all duration-200 field block-field ${hardFilters.seniorityMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}>
                <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="seniority" className={`text-sm font-semibold transition-colors ${hardFilters.seniorityMandatory ? 'text-yellow-300' : 'text-yellow-200'}`}>
                        Cấp bậc {hardFilters.seniorityMandatory && <span className="text-red-400">*</span>}
                    </label>
                    <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="seniorityMandatory" className="flex items-center cursor-pointer">
                        <input type="checkbox" id="seniorityMandatory" checked={hardFilters.seniorityMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-yellow-500 bg-slate-700 border-slate-600 rounded focus:ring-yellow-600 focus:ring-offset-slate-800"/>
                    </label>
                </div>
                <select id="seniority" value={hardFilters.seniority} onChange={handleChange} className={inputClasses(hardFilters.seniorityMandatory, !!hardFilters.seniority) + ' hf-control'}>
                    <option value="">-- Không yêu cầu --</option>
                    <option value="Intern">Intern</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid-level">Mid-level</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                </select>
            </div>
    {/* Industry */}
     <div className={`p-3 rounded-lg border transition-all duration-200 field block-field ${hardFilters.industryMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}>
            <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="industry" className={`text-sm font-medium transition-colors ${hardFilters.industryMandatory ? 'text-blue-300' : 'text-slate-300'}`}>
                    Ngành nghề {hardFilters.industryMandatory && <span className="text-red-400">*</span>}
                </label>
                <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="industryMandatory" className="flex items-center cursor-pointer">
                    <input type="checkbox" id="industryMandatory" checked={hardFilters.industryMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-indigo-500 bg-slate-700 border-slate-600 rounded focus:ring-indigo-600 focus:ring-offset-slate-800"/>
                </label>
            </div>
            <input type="text" id="industry" value={hardFilters.industry} onChange={handleChange} placeholder="Vd: Software" className={inputClasses(hardFilters.industryMandatory, !!hardFilters.industry) + ' hf-control'} />
        </div>

        {/* Language */}
    <div className={`p-3 rounded-lg border transition-all duration-200 field block-field ${hardFilters.languageMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}>
            <div className="flex justify-between items-center mb-1.5">
                <label className={`text-sm font-semibold transition-colors ${hardFilters.languageMandatory ? 'text-purple-300' : 'text-purple-200'}`}>
                    Ngôn ngữ {hardFilters.languageMandatory && <span className="text-red-400">*</span>}
                </label>
                <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="languageMandatory" className="flex items-center cursor-pointer">
                    <input type="checkbox" id="languageMandatory" checked={hardFilters.languageMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-pink-500 bg-slate-700 border-slate-600 rounded focus:ring-pink-600 focus:ring-offset-slate-800"/>
                </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <input type="text" id="language" value={hardFilters.language} onChange={handleChange} placeholder="Vd: Tiếng Anh" className={inputClasses(hardFilters.languageMandatory, !!hardFilters.language) + ' hf-control'} />
                <select id="languageLevel" value={hardFilters.languageLevel} onChange={handleChange} className={inputClasses(false, true) + ' hf-control'}> {/* Not mandatory itself, but related */}
                    <option value="">-- Mức yêu cầu --</option>
                    <option value="B1">CEFR B1</option>
                    <option value="B2">CEFR B2</option>
                    <option value="C1">CEFR C1</option>
                    <option value="C2">CEFR C2</option>
                </select>
            </div>
        </div>
        
                {/* Education + Certificates (combined row) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                    <div className={`p-3 rounded-lg border transition-all duration-200 field block-field flex flex-col ${hardFilters.educationMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}> 
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="education" className={`text-sm font-semibold transition-colors ${hardFilters.educationMandatory ? 'text-orange-300' : 'text-orange-200'}`}>
                                Bằng cấp {hardFilters.educationMandatory && <span className="text-red-400">*</span>}
                            </label>
                            <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="educationMandatory" className="flex items-center cursor-pointer">
                                <input type="checkbox" id="educationMandatory" checked={hardFilters.educationMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-600 focus:ring-offset-slate-800" />
                            </label>
                        </div>
                        <select id="education" value={hardFilters.education} onChange={handleChange} className={inputClasses(hardFilters.educationMandatory, !!hardFilters.education) + ' hf-control mt-auto'}>
                            <option value="">-- Không yêu cầu --</option>
                            <option value="High School">Tốt nghiệp THPT</option>
                            <option value="Associate">Cao đẳng</option>
                            <option value="Bachelor">Cử nhân</option>
                            <option value="Master">Thạc sĩ</option>
                            <option value="PhD">Tiến sĩ</option>
                        </select>
                    </div>
                    <div className={`p-3 rounded-lg border transition-all duration-200 field block-field flex flex-col ${hardFilters.certificatesMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}>
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="certificates" className={`text-sm font-semibold transition-colors ${hardFilters.certificatesMandatory ? 'text-pink-300' : 'text-pink-200'}`}>
                                Chứng chỉ {hardFilters.certificatesMandatory && <span className="text-red-400">*</span>}
                            </label>
                            <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="certificatesMandatory" className="flex items-center cursor-pointer">
                                <input type="checkbox" id="certificatesMandatory" checked={hardFilters.certificatesMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-purple-500 bg-slate-700 border-slate-600 rounded focus:ring-purple-600 focus:ring-offset-slate-800" />
                            </label>
                        </div>
                        <input type="text" id="certificates" value={hardFilters.certificates} onChange={handleChange} placeholder="Vd: PMP, IELTS 7.0" className={inputClasses(hardFilters.certificatesMandatory, !!hardFilters.certificates) + ' hf-control mt-auto'} />
                    </div>
                </div>
                {/* Work Format + Contract Type (combined row) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                    <div className={`p-3 rounded-lg border transition-all duration-200 field block-field flex flex-col ${hardFilters.workFormatMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}> 
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="workFormat" className={`text-sm font-medium transition-colors ${hardFilters.workFormatMandatory ? 'text-blue-300' : 'text-slate-300'}`}>Hình thức {hardFilters.workFormatMandatory && <span className="text-red-400">*</span>}</label>
                            <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="workFormatMandatory" className="flex items-center cursor-pointer">
                                <input type="checkbox" id="workFormatMandatory" checked={hardFilters.workFormatMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-cyan-600 focus:ring-offset-slate-800" />
                            </label>
                        </div>
                        <select id="workFormat" value={hardFilters.workFormat} onChange={handleChange} className={inputClasses(hardFilters.workFormatMandatory, !!hardFilters.workFormat) + ' hf-control mt-auto'}>
                            <option value="">-- Không yêu cầu --</option>
                            <option value="Onsite">Onsite</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Remote">Remote</option>
                        </select>
                    </div>
                    <div className={`p-3 rounded-lg border transition-all duration-200 field block-field flex flex-col ${hardFilters.contractTypeMandatory ? 'bg-blue-900/30 border-blue-700/50' : 'border-slate-700/40'}`}> 
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="contractType" className={`text-sm font-medium transition-colors ${hardFilters.contractTypeMandatory ? 'text-blue-300' : 'text-slate-300'}`}>Hợp đồng {hardFilters.contractTypeMandatory && <span className="text-red-400">*</span>}</label>
                            <label title="Đánh dấu tiêu chí này là bắt buộc" htmlFor="contractTypeMandatory" className="flex items-center cursor-pointer">
                                <input type="checkbox" id="contractTypeMandatory" checked={hardFilters.contractTypeMandatory} onChange={handleMandatoryChange} className="w-4 h-4 text-teal-500 bg-slate-700 border-slate-600 rounded focus:ring-teal-600 focus:ring-offset-slate-800" />
                            </label>
                        </div>
                        <select id="contractType" value={hardFilters.contractType} onChange={handleChange} className={inputClasses(hardFilters.contractTypeMandatory, !!hardFilters.contractType) + ' hf-control mt-auto'}>
                            <option value="">-- Không yêu cầu --</option>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Intern">Intern</option>
                            <option value="Contract">Contract</option>
                        </select>
                    </div>
                </div>
        
      </div>
    </div>
  );
};

export default HardFilterPanel;