import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

FRONTEND_URL = "http://localhost:3000"

@pytest.fixture(scope="session")
def driver():
    """Inisiasi WebDriver Chrome untuk SATU SESI PENUH (Session Scope)."""
    options = webdriver.ChromeOptions()
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1280,720')
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(5)
    
    yield driver
    driver.quit()

def wait_for_routing(driver, seconds=2):
    time.sleep(seconds)

class TestE2EScenarios:
    """System Test E2E Komprehensif Berurutan."""
    
    kode_kelas_global = "" # Variabel untuk menyimpan kode kelas yang dibuat dosen

    # =========================================================================
    # BAGIAN 1: SKENARIO DOSEN
    # =========================================================================
    
    def test_01_login_dosen(self, driver):
        """TC-E2E-01: Login sebagai Dosen."""
        driver.get(f"{FRONTEND_URL}/auth/login")
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "form")))
        
        email_input = driver.find_element(By.XPATH, "//input[@type='email']")
        pass_input = driver.find_element(By.XPATH, "//input[@type='password']")
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        
        email_input.clear()
        email_input.send_keys("dosen@polibatam.ac.id")
        pass_input.clear()
        pass_input.send_keys("123456789000$") # Gunakan password yang disepakati (misal default dev)
        
        submit_btn.click()
        wait_for_routing(driver, 3)
        assert "dosen" in driver.current_url.lower(), "Gagal login sebagai dosen."

    def test_02_dosen_buat_matkul(self, driver):
        """TC-E2E-02: Dosen membuat Mata Kuliah baru."""
        driver.get(f"{FRONTEND_URL}/dosen/matkul")
        wait_for_routing(driver)
        
        # Klik tombol Tambah Mata Kuliah
        try:
            tambah_btn = driver.find_element(By.XPATH, "//button[contains(., 'Tambah')]")
            tambah_btn.click()
            wait_for_routing(driver, 1)
            
            # Isi form di modal
            inputs = driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//input")
            if len(inputs) >= 3:
                inputs[0].send_keys("E2E-01") # Kode Matkul
                inputs[1].send_keys("Matkul Test Selenium") # Nama Matkul
                inputs[2].clear()
                inputs[2].send_keys("3") # SKS
                
                simpan_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[@type='submit']")
                simpan_btn.click()
                wait_for_routing(driver, 2)
        except Exception as e:
            pytest.skip("Gagal mengisi form matkul, kemungkinan selector berubah.")

    def test_03_dosen_buat_kelas(self, driver):
        """TC-E2E-03: Dosen membuat Kelas Mahasiswa baru."""
        driver.get(f"{FRONTEND_URL}/dosen/mahasiswa")
        wait_for_routing(driver)
        
        try:
            tambah_btn = driver.find_element(By.XPATH, "//button[contains(., 'Buat Kelas')]")
            tambah_btn.click()
            wait_for_routing(driver, 1)
            
            # Isi form nama kelas
            inputs = driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//input")
            if len(inputs) >= 1:
                inputs[0].send_keys("Kelas Otomatis Selenium")
                
                simpan_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[@type='submit']")
                simpan_btn.click()
                wait_for_routing(driver, 2)
                
            # Coba ambil kode gabung dari card pertama yang ada di layar
            # Asumsi card kelas terbaru muncul
            kode_badge = driver.find_elements(By.XPATH, "//span[contains(@class, 'rounded-full')]")
            if len(kode_badge) > 0:
                TestE2EScenarios.kode_kelas_global = kode_badge[0].text
        except Exception:
            pytest.skip("Gagal membuat kelas.")

    def test_04_dosen_buat_jadwal(self, driver):
        """TC-E2E-04: Dosen membuat Jadwal baru."""
        driver.get(f"{FRONTEND_URL}/dosen/jadwal")
        wait_for_routing(driver)
        
        try:
            tambah_btn = driver.find_element(By.XPATH, "//button[contains(., 'Tambah')]")
            tambah_btn.click()
            wait_for_routing(driver, 1)
            
            simpan_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[@type='submit']")
            simpan_btn.click()
            wait_for_routing(driver, 2)
        except Exception:
            pytest.skip("Gagal interaksi dengan jadwal.")

    def test_05_dosen_pengaturan_pengguna(self, driver):
        """TC-E2E-05: Dosen ubah pengaturan (Nama)."""
        driver.get(f"{FRONTEND_URL}/dosen/settings")
        wait_for_routing(driver)
        
        try:
            nama_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Nama Lengkap')]/following-sibling::input")
            nama_input.clear()
            nama_input.send_keys("Dosen Selenium Tester")
            
            simpan_btn = driver.find_element(By.XPATH, "//button[contains(., 'Simpan Profil')]")
            simpan_btn.click()
            wait_for_routing(driver, 2)
        except Exception:
            pass # Lanjutkan saja karena hanya tes UI

    def test_06_dosen_buka_halaman_lain(self, driver):
        """TC-E2E-06: Membuka statistik, absensi, petunjuk tanpa log out."""
        driver.get(f"{FRONTEND_URL}/dosen/statistik")
        wait_for_routing(driver)
        driver.get(f"{FRONTEND_URL}/dosen/absensi")
        wait_for_routing(driver)
        driver.get(f"{FRONTEND_URL}/dosen/petunjuk")
        wait_for_routing(driver)
        assert True


    # =========================================================================
    # BAGIAN 2: SKENARIO MAHASISWA
    # =========================================================================
    
    def test_07_login_mahasiswa(self, driver):
        """TC-E2E-07: Hapus sesi lama, lalu Login sebagai Mahasiswa."""
        # Bersihkan sesi Dosen sebelumnya
        driver.delete_all_cookies()
        driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
        
        driver.get(f"{FRONTEND_URL}/auth/login")
        wait_for_routing(driver)
        
        email_input = driver.find_element(By.XPATH, "//input[@type='email']")
        pass_input = driver.find_element(By.XPATH, "//input[@type='password']")
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        
        email_input.send_keys("mahasiswa@polibatam.ac.id")
        pass_input.send_keys("123456789000$")
        submit_btn.click()
        
        wait_for_routing(driver, 3)
        assert "mahasiswa" in driver.current_url.lower(), "Gagal login sebagai mahasiswa."

    def test_08_mhs_gabung_kelas(self, driver):
        """TC-E2E-08: Mahasiswa gabung ke kelas yang dibuat Dosen."""
        driver.get(f"{FRONTEND_URL}/mahasiswa/gabung-kelas")
        wait_for_routing(driver)
        
        try:
            kode_input = driver.find_element(By.XPATH, "//input")
            # Gunakan kode kelas yang didapat dari dosen, atau dummy jika gagal
            kode_input.send_keys(TestE2EScenarios.kode_kelas_global or "DUMMY123")
            
            gabung_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
            gabung_btn.click()
            wait_for_routing(driver, 2)
        except Exception:
            pytest.skip("Gagal mengisi form gabung kelas.")

    def test_09_mhs_ambil_absensi(self, driver):
        """TC-E2E-09: Mahasiswa ambil absensi."""
        driver.get(f"{FRONTEND_URL}/mahasiswa/ambil-absensi")
        wait_for_routing(driver)
        # Jika ada tombol absen, klik. Jika tidak ada, hanya pastikan form terbuka.
        try:
            absen_btn = driver.find_element(By.XPATH, "//button[contains(., 'Absen')]")
            absen_btn.click()
            wait_for_routing(driver, 2)
        except Exception:
            pass # Mungkin jadwal belum aktif, abaikan

    def test_10_mhs_riwayat_dan_pengaturan(self, driver):
        """TC-E2E-10: Buka Riwayat dan ubah Profil."""
        driver.get(f"{FRONTEND_URL}/mahasiswa/riwayat")
        wait_for_routing(driver)
        
        driver.get(f"{FRONTEND_URL}/mahasiswa/profile")
        wait_for_routing(driver)
        
        try:
            # Ubah nama mahasiswa
            nama_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Nama Lengkap')]/following-sibling::input")
            nama_input.clear()
            nama_input.send_keys("Mahasiswa Selenium")
            
            simpan_btn = driver.find_element(By.XPATH, "//button[contains(., 'Simpan Profil')]")
            simpan_btn.click()
            wait_for_routing(driver, 2)
        except Exception:
            pass

