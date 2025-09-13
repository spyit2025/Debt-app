<?php
// การตั้งค่าฐานข้อมูล
class Database {
    private $host = "localhost";
    private $db_name = "elearning_db";
    private $username = "root";
    private $password = "";
    private $conn;

    // ฟังก์ชันเชื่อมต่อฐานข้อมูล
    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            echo "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: " . $exception->getMessage();
        }

        return $this->conn;
    }
}
?>
