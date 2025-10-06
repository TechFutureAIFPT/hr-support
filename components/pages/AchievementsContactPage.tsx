import React from 'react';

const AchievementsContactPage: React.FC = () => {
  const achievements = [
    { src: '/photo/trophie/Khuyến Khích Tin Học Trẻ.jpg', alt: 'Khuyến Khích Tin Học Trẻ' },
    { src: '/photo/trophie/sáng tạo thanh thiếu niên.jpg', alt: 'Sáng tạo Thanh Thiếu Niên' },
    { src: '/photo/trophie/tmhp.png', alt: 'TMHP' },
  ];

  const contactImage = '/photo/contact/contact top cv.jpg';

  return (
    <div className="min-h-screen text-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors duration-200 group"
          >
            <i className="fa-solid fa-arrow-left text-lg text-blue-400 group-hover:text-blue-300"></i>
            <span className="text-sm font-medium">Quay lại</span>
          </button>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Thành Tích & Liên Hệ</h1>
          <p className="text-slate-400 text-lg">Các thành tích đạt được và thông tin liên hệ</p>
        </div>

        {/* Thành Tích Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-white mb-8 text-center">Thành Tích</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {achievements.map((achievement, index) => (
              <div key={index} className="bg-slate-800/50 rounded-xl p-6 hover:bg-slate-800/70 transition-colors duration-200">
                <div className="aspect-square mb-4 overflow-hidden rounded-lg">
                  <img
                    src={achievement.src}
                    alt={achievement.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-medium text-white text-center">{achievement.alt}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Liên Hệ Section */}
        <section>
          <h2 className="text-3xl font-semibold text-white mb-8 text-center">Liên Hệ</h2>
          <div className="flex justify-center">
            <div className="bg-slate-800/50 rounded-xl p-8 hover:bg-slate-800/70 transition-colors duration-200 max-w-md">
              <div className="aspect-[3/2] mb-6 overflow-hidden rounded-lg">
                <img
                  src={contactImage}
                  alt="Contact Information"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-medium text-white mb-2">Thông Tin Liên Hệ</h3>
                <p className="text-slate-400">Chi tiết liên hệ có trong hình ảnh trên</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AchievementsContactPage;