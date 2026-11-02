const path = require('path');
const fs = require('fs');
const dotenvPath = fs.existsSync(path.join(__dirname, '..', '.env'))
  ? path.join(__dirname, '..', '.env')
  : path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: dotenvPath });
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Student = require('../models/Student');
const FinalYearProject = require('../models/FinalYearProject');
const InternshipReport = require('../models/InternshipReport');
const SemesterMark = require('../models/SemesterMark');
const CiaMark = require('../models/CiaMark');

// Curriculum subjects defined by user
const CURRICULUM = {
  1: [
    { code: 'CS24101', name: 'Programming in C', type: 'Theory', max: 100 },
    { code: 'MA24102', name: 'Mathematics for Computer Science', type: 'Theory', max: 100 },
    { code: 'CS24103', name: 'Digital Fundamentals', type: 'Theory', max: 100 },
    { code: 'CS24104', name: 'Computer Fundamentals', type: 'Theory', max: 100 },
    { code: 'EN24105', name: 'English I', type: 'Theory', max: 100 },
    { code: 'CS24106P', name: 'C Programming Lab', type: 'Practical', max: 100 },
  ],
  2: [
    { code: 'CS24201', name: 'Data Structures', type: 'Theory', max: 100 },
    { code: 'CS24202', name: 'Object Oriented Programming with C++', type: 'Theory', max: 100 },
    { code: 'CS24203', name: 'Database Management Systems', type: 'Theory', max: 100 },
    { code: 'CS24204', name: 'Operating Systems', type: 'Theory', max: 100 },
    { code: 'EN24205', name: 'English II', type: 'Theory', max: 100 },
    { code: 'CS24206P', name: 'Data Structures and C++ Lab', type: 'Practical', max: 100 },
  ],
  3: [
    { code: 'CS24301', name: 'Java Programming', type: 'Theory', max: 100 },
    { code: 'CS24302', name: 'Computer Networks', type: 'Theory', max: 100 },
    { code: 'CS24303', name: 'Software Engineering', type: 'Theory', max: 100 },
    { code: 'CS24304', name: 'Python Programming', type: 'Theory', max: 100 },
    { code: 'CS24305', name: 'Cyber Security Fundamentals', type: 'Theory', max: 100 },
    { code: 'CS24306P', name: 'Java and Python Programming Lab', type: 'Practical', max: 100 },
  ],
  4: [
    { code: 'CS24401', name: 'Web Technology', type: 'Theory', max: 100 },
    { code: 'CS24402', name: 'Cryptography and Network Security', type: 'Theory', max: 100 },
    { code: 'CS24403', name: 'Ethical Hacking', type: 'Theory', max: 100 },
    { code: 'CS24404', name: 'Cloud Computing', type: 'Theory', max: 100 },
    { code: 'CS24405', name: 'Computer Architecture', type: 'Theory', max: 100 },
    { code: 'CS24406P', name: 'Cyber Security Practical Lab', type: 'Practical', max: 100 },
  ],
  5: [
    { code: 'CS24501', name: 'Penetration Testing', type: 'Theory', max: 100 },
    { code: 'CS24502', name: 'Digital Forensics', type: 'Theory', max: 100 },
    { code: 'CS24503', name: 'Malware Analysis', type: 'Theory', max: 100 },
    { code: 'CS24504P', name: 'Network Security Lab', type: 'Practical', max: 100 },
    { code: 'CS24505P', name: 'Ethical Hacking Lab', type: 'Practical', max: 100 },
  ],
  6: [
    { code: 'CS24601', name: 'Vulnerability Assessment', type: 'Theory', max: 100 },
    { code: 'CS24602', name: 'Incident Response and Security Management', type: 'Theory', max: 100 },
    { code: 'CS24603', name: 'Cyber Laws and Digital Investigation', type: 'Theory', max: 100 },
    { code: 'CS24604P', name: 'Cyber Security Project', type: 'Practical', max: 100 },
    { code: 'CS24605P', name: 'Security Audit and Forensics Lab', type: 'Practical', max: 100 },
  ],
};

// Explicit individual records for all 42 students from the uploaded documents
const STUDENTS_2024 = [
  {
    "sno": 1,
    "umisId": "9002785471",
    "regNo": "24SCC4501",
    "name": "JANANI R",
    "gender": "Female",
    "dob": "11-04-2007",
    "email": "jananir11042007@gmail.com",
    "phone": "7540074993",
    "fypTitle": "AI-Powered Anomaly Detection in Network Traffic",
    "fypDesc": "Detects zero-day anomalies using unsupervised deep learning and Suricata telemetry.",
    "fypTech": "Python, TensorFlow, Suricata, Docker",
    "internCompany": "CyberSec Labs India",
    "internDomain": "Cyber Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Kali Linux, Wireshark, Nmap, Burp Suite"
  },
  {
    "sno": 2,
    "umisId": "9002780219",
    "regNo": "24SCC4502",
    "name": "KOUSIKA K",
    "gender": "Female",
    "dob": "01-02-2007",
    "email": "kousikakumar09@gmail.com",
    "phone": "8056727429",
    "fypTitle": "Automated Web Vulnerability Scanner & Exploit Analyzer",
    "fypDesc": "Automates OWASP Top 10 web vulnerabilities scanning with remediation reporting.",
    "fypTech": "Node.js, Burp Suite API, Python, Express",
    "internCompany": "Erode InfoTech Solutions",
    "internDomain": "Penetration Testing",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "OWASP ZAP, Burp Suite, Python"
  },
  {
    "sno": 3,
    "umisId": "9002780466",
    "regNo": "24SCC4503",
    "name": "MYKASHINI R",
    "gender": "Female",
    "dob": "28-03-2007",
    "email": "mykashini2007@gmail.com",
    "phone": "9884590532",
    "fypTitle": "Blockchain-Based Secure Healthcare Records Management",
    "fypDesc": "Decentralized and cryptographically verifiable EHR access control system.",
    "fypTech": "Solidity, Ethereum, Web3.js, React",
    "internCompany": "ShieldNet Defense Corp",
    "internDomain": "Cryptography & Blockchain",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "SHA-256, Smart Contracts, IPFS"
  },
  {
    "sno": 4,
    "umisId": "9002783807",
    "regNo": "24SCC4504",
    "name": "POOJASRI S",
    "gender": "Female",
    "dob": "18-01-2007",
    "email": "poojasris261@gmail.com",
    "phone": "9489342552",
    "fypTitle": "Zero-Trust Cloud Identity & Access Governance Framework",
    "fypDesc": "Enforces strict least-privilege role policies and automated token rotation.",
    "fypTech": "AWS IAM, OAuth2, OpenID Connect, Python",
    "internCompany": "CloudGuard Systems",
    "internDomain": "Cloud Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Docker, AWS CloudTrail, Terraform"
  },
  {
    "sno": 5,
    "umisId": "9002785610",
    "regNo": "24SCC4505",
    "name": "SAI INIYA M",
    "gender": "Female",
    "dob": "02-06-2007",
    "email": "msaiiniya.2007@gmail.com",
    "phone": "6381142246",
    "fypTitle": "Automated Phishing Campaign Detection via Email Header ML",
    "fypDesc": "Analyzes SPF, DKIM, DMARC alignment and natural language deception cues.",
    "fypTech": "Python, Scikit-Learn, Flask, IMAP Parser",
    "internCompany": "Apex Cyber Solutions",
    "internDomain": "Email & Threat Defense",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "SPF, DKIM, URLVoid, Python"
  },
  {
    "sno": 6,
    "umisId": "9002785715",
    "regNo": "24SCC4506",
    "name": "SANJANAKRISHNAN R",
    "gender": "Female",
    "dob": "23-01-2007",
    "email": "sanjanakrishnan825@gmail.com",
    "phone": "9724986641",
    "fypTitle": "Digital Forensics Memory & Artifact Investigation Tool",
    "fypDesc": "Extracts volatile memory dumps and visualizes process execution lineages.",
    "fypTech": "Volatility, Autopsy, FTK Imager, Python",
    "internCompany": "ForensiTech Research",
    "internDomain": "Digital Forensics",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Autopsy, FTK Imager, YARA"
  },
  {
    "sno": 7,
    "umisId": "9002786068",
    "regNo": "24SCC4507",
    "name": "SAVITHA V",
    "gender": "Female",
    "dob": "17-12-2004",
    "email": "savithavishwathan2817@gmail.com",
    "phone": "8248479596",
    "fypTitle": "Cross-Site Request Forgery (CSRF) Token Validation & Defense",
    "fypDesc": "Enforces SameSite cookie attributes and cryptographic double-submit token verification.",
    "fypTech": "Node.js, Express, Helmet, Redis",
    "internCompany": "CyberDefense Hub Erode",
    "internDomain": "Web Application Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Burp Suite, DevTools, Kali Linux"
  },
  {
    "sno": 8,
    "umisId": "9002814043",
    "regNo": "24SCC4508",
    "name": "SIVAKARTHIKA P",
    "gender": "Female",
    "dob": "26-11-2006",
    "email": "mohanakarthika2021@gmail.com",
    "phone": "9042250304",
    "fypTitle": "Smart IoT Firewall with Dynamic Rule Configuration",
    "fypDesc": "Filters malicious MQTT/CoAP telemetry from compromised smart home gadgets.",
    "fypTech": "Raspberry Pi, iptables, Python, MQTT",
    "internCompany": "IoT Shield Labs",
    "internDomain": "Network Defense",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Packet Tracer, Wireshark, Linux ACLs"
  },
  {
    "sno": 9,
    "umisId": "9002785837",
    "regNo": "24SCC4509",
    "name": "SUGANYA V",
    "gender": "Female",
    "dob": "11-01-2007",
    "email": "sundharraj2004@gmail.com",
    "phone": "8072880863",
    "fypTitle": "Steganographic Malware Transmission Detection & Prevention",
    "fypDesc": "Discovers hidden command payloads inside JPEG/PNG cover media using neural networks.",
    "fypTech": "StegExpose, Steghide, PyTorch, OpenCV",
    "internCompany": "Defensive Tech Labs",
    "internDomain": "Steganography & Malware",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Steghide, YARA, Python"
  },
  {
    "sno": 10,
    "umisId": "9002786123",
    "regNo": "24SCC4510",
    "name": "SUJITHA V",
    "gender": "Female",
    "dob": "04-11-2006",
    "email": "sujitha24245@gmail.com",
    "phone": "7092514211",
    "fypTitle": "Ransomware Canary Early-Warning System for File Servers",
    "fypDesc": "Places decoy filesystem honeypots to trip and kill ransomware processes in under 50ms.",
    "fypTech": "C++, Windows API, Minifilter Driver, Python",
    "internCompany": "Endpoint Shield Innovations",
    "internDomain": "Malware Analysis",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Process Explorer, Wireshark, Autopsy"
  },
  {
    "sno": 11,
    "umisId": "9002786169",
    "regNo": "24SCC4513",
    "name": "VISHNUPRIYA M S",
    "gender": "Female",
    "dob": "03-11-2006",
    "email": "vishupriyasakthivel9@gmail.com",
    "phone": "7010009717",
    "fypTitle": "Comprehensive Cyber Threat Intelligence & SIEM Dashboard",
    "fypDesc": "Aggregates threat feeds (MISP, AlienVault) into an actionable SOC operations UI.",
    "fypTech": "Elasticsearch, Logstash, Kibana, Python",
    "internCompany": "Cyber Defense Center Coimbatore",
    "internDomain": "Cyber Security & Network Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Kali Linux, Cisco Packet Tracer, Wireshark, Autopsy"
  },
  {
    "sno": 12,
    "umisId": "9002784674",
    "regNo": "24SCC4514",
    "name": "ABIKAR A",
    "gender": "Male",
    "dob": "01-06-2006",
    "email": "flower143love143@gmail.com",
    "phone": "9363604571",
    "fypTitle": "Automated Port Scanning & Service Fingerprinting Defense",
    "fypDesc": "Honeyd-based honeypot emulator to deceive active external port scouts.",
    "fypTech": "Python, Scapy, Nmap Scripts, Docker",
    "internCompany": "NetSecure Technologies",
    "internDomain": "Network Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Nmap, Gobuster, Packet Tracer"
  },
  {
    "sno": 13,
    "umisId": "9002785162",
    "regNo": "24SCC4515",
    "name": "ARUN R",
    "gender": "Male",
    "dob": "12-09-2006",
    "email": "rarun03283@gmail.com",
    "phone": "9487320520",
    "fypTitle": "Linux Kernel Rootkit Detection Using eBPF Telemetry",
    "fypDesc": "Hooks syscall entries in kernel-space to expose concealed processes and sockets.",
    "fypTech": "C, eBPF, BCC, Linux Kernel 6.x",
    "internCompany": "KernelSec Systems",
    "internDomain": "System Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Kali Linux, GDB, Bash, Docker"
  },
  {
    "sno": 14,
    "umisId": "9002785244",
    "regNo": "24SCC4516",
    "name": "DEEPAK G",
    "gender": "Male",
    "dob": "29-11-2006",
    "email": "deepakdeepii903@gmail.com",
    "phone": "9025141855",
    "fypTitle": "Automated SQL Injection Prevention & Remediation Middleware",
    "fypDesc": "AST parser that inspects raw SQL queries in application middleware before execution.",
    "fypTech": "Node.js, SQLParser, Express, PostgreSQL",
    "internCompany": "WebGuard Infotech",
    "internDomain": "Web Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Burp Suite, OWASP Juice Shop, DVWA"
  },
  {
    "sno": 15,
    "umisId": "9002785393",
    "regNo": "24SCC4517",
    "name": "DHESIGAN S",
    "gender": "Male",
    "dob": "28-12-2006",
    "email": "dhesigansithan2006@gmail.com",
    "phone": "7904111780",
    "fypTitle": "Cryptographic Password Storage & Vault Auditing System",
    "fypDesc": "Enforces Argon2id salting and checks user credentials against HIBP database.",
    "fypTech": "Argon2id, Web Crypto API, React, Node.js",
    "internCompany": "CryptoVault Solutions",
    "internDomain": "Cryptography",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Hydra, Hashcat, John the Ripper"
  },
  {
    "sno": 16,
    "umisId": "9002785100",
    "regNo": "24SCC4519",
    "name": "GOWTHAM S N",
    "gender": "Male",
    "dob": "11-11-2006",
    "email": "gowthamraj11112006@gmail.com",
    "phone": "9176903638",
    "fypTitle": "Wi-Fi Evil Twin & Rogue Access Point Triangulation",
    "fypDesc": "Monitors 802.11 beacon frames to alert against deauthentication and spoofed SSIDs.",
    "fypTech": "Aircrack-ng, Python, Scapy, Kali Linux",
    "internCompany": "WirelessDefense Labs",
    "internDomain": "Wireless Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Wireshark, Cisco Packet Tracer, Linux"
  },
  {
    "sno": 17,
    "umisId": "9002793206",
    "regNo": "24SCC4520",
    "name": "S GOWTHAMAN",
    "gender": "Male",
    "dob": "25-07-2006",
    "email": "gowthamans714@gmail.com",
    "phone": "9087047155",
    "fypTitle": "Containerized Microservices Hardening & Vulnerability Scanner",
    "fypDesc": "Scans Docker images for CVEs and misconfigurations in runtime environments.",
    "fypTech": "Trivy, Docker, Kubernetes, Python",
    "internCompany": "DevSecOps Hub",
    "internDomain": "Cloud & Container Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Docker, Linux Shell, Portainer"
  },
  {
    "sno": 18,
    "umisId": "9002786204",
    "regNo": "24SCC4521",
    "name": "GURUMURTHI H",
    "gender": "Male",
    "dob": "12-02-2007",
    "email": "hhgurumurthi@gmail.com",
    "phone": "8610051421",
    "fypTitle": "Malware Sandboxing & Automated Behavioral Analysis Platform",
    "fypDesc": "Executes suspicious binaries inside isolated guest VMs to record registry modifications.",
    "fypTech": "Cuckoo Sandbox, Python, QEMU, YARA",
    "internCompany": "ThreatIntel Labs",
    "internDomain": "Malware Analysis",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "FTK Imager, Autopsy, YARA Rules"
  },
  {
    "sno": 19,
    "umisId": "9002786217",
    "regNo": "24SCC4522",
    "name": "HARISH D",
    "gender": "Male",
    "dob": "11-03-2006",
    "email": "hariharish11032006@gmail.com",
    "phone": "9600302544",
    "fypTitle": "DNS Sinkholing & Malicious Domain Filtering Gateway",
    "fypDesc": "Intercepts internal DNS lookups and redirects queries for known C2 server domains.",
    "fypTech": "Bind9, Python, ThreatFeeds API, Linux",
    "internCompany": "NetDefense Services",
    "internDomain": "Network Defense",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "DNS, DHCP, Packet Tracer, IP Void"
  },
  {
    "sno": 20,
    "umisId": "9002787056",
    "regNo": "24SCC4523",
    "name": "JAMBUKESHWAR D",
    "gender": "Male",
    "dob": "04-06-2007",
    "email": "arundurai462007@gmail.com",
    "phone": "9344475026",
    "fypTitle": "Cross-Site Scripting (XSS) Sanitization Engine for Modern SPAs",
    "fypDesc": "Context-aware DOM sanitization module neutralizing reflective and stored payload injections.",
    "fypTech": "JavaScript, DOMPurify, React, Node.js",
    "internCompany": "AppSecure Solutions",
    "internDomain": "Application Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Burp Suite, DevTools, Gobuster"
  },
  {
    "sno": 21,
    "umisId": "9002793020",
    "regNo": "24SCC4524",
    "name": "KARTHICK V",
    "gender": "Male",
    "dob": "10-02-2007",
    "email": "kartikkarthick82@gmail.com",
    "phone": "8667316956",
    "fypTitle": "Advanced Ransomware Detection & Behavioral Analysis using Endpoint Telemetry",
    "fypDesc": "Real-time endpoint agent analyzing high-entropy file writes and mass rename activity.",
    "fypTech": "Python, Windows Sysinternals, Machine Learning, SQLite",
    "internCompany": "Cyber Defense Center Coimbatore",
    "internDomain": "Cyber Security & Network Defense",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Kali Linux, Wireshark, Burp Suite, Cisco Packet Tracer, Autopsy",
    "sem1Marks": {
      "CS24101": 85,
      "MA24102": 78,
      "CS24103": 82,
      "CS24104": 90,
      "EN24105": 80,
      "CS24106P": 92
    }
  },
  {
    "sno": 22,
    "umisId": "9002786227",
    "regNo": "24SCC4525",
    "name": "KISHORE K",
    "gender": "Male",
    "dob": "17-10-2006",
    "email": "thiyagarajthiyagu0@gmail.com",
    "phone": "6380504159",
    "fypTitle": "Serverless Security Posture Management on AWS Lambda",
    "fypDesc": "Automates security scanning of serverless application dependencies and permissions.",
    "fypTech": "AWS CloudWatch, Python, Bandit, Docker",
    "internCompany": "CloudOps Secure India",
    "internDomain": "Cloud Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "AWS IAM, S3 Policies, Docker"
  },
  {
    "sno": 23,
    "umisId": "9002783241",
    "regNo": "24SCC4526",
    "name": "KRISHNAKARTHIK S",
    "gender": "Male",
    "dob": "15-09-2006",
    "email": "karthik001km@gmail.com",
    "phone": "9789892662",
    "fypTitle": "USB Malware Autorun Blocker & Mass Storage Sanitizer",
    "fypDesc": "Hardware-level USB interception software preventing malicious HID injection.",
    "fypTech": "Python, pywin32, YARA, Windows Driver Kit",
    "internCompany": "HardwareSec Labs",
    "internDomain": "Endpoint Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "FTK Imager, USBSTOR Registry, Autopsy"
  },
  {
    "sno": 24,
    "umisId": "9002783435",
    "regNo": "24SCC4527",
    "name": "LOGESHWARAN C",
    "gender": "Male",
    "dob": "07-09-2007",
    "email": "logeshc7904@gmail.com",
    "phone": "7904783877",
    "fypTitle": "SYN Flood DDoS Mitigation Using Dynamic Rate Limiting",
    "fypDesc": "Kernel-level SYN cookie enforcer and anomalous connection rate throttling.",
    "fypTech": "iptables, XDP, eBPF, Linux",
    "internCompany": "NetShield Telecom",
    "internDomain": "Network Defense",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Wireshark, Packet Tracer, Nmap"
  },
  {
    "sno": 25,
    "umisId": "9002783082",
    "regNo": "24SCC4528",
    "name": "MADESHWARAN P",
    "gender": "Male",
    "dob": "19-12-2005",
    "email": "madeshwaran26003@gmail.com",
    "phone": "8072964119",
    "fypTitle": "Web Application API Security Testing Automation Suite",
    "fypDesc": "Tests REST endpoints for broken object level authorization (BOLA) vulnerabilities.",
    "fypTech": "Python, Postman Newman, OWASP Zap, Docker",
    "internCompany": "SecureAPI Consulting",
    "internDomain": "API Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Burp Suite Repeater, Postman, Node.js"
  },
  {
    "sno": 26,
    "umisId": "9002783117",
    "regNo": "24SCC4529",
    "name": "MAHIN R",
    "gender": "Male",
    "dob": "20-06-2007",
    "email": "rmahin20062007@gmail.com",
    "phone": "9894473356",
    "fypTitle": "SOC Incident Response Playbook Automation using Python",
    "fypDesc": "Orchestrates automated containment steps upon high-severity alert triggers.",
    "fypTech": "Python, TheHive, Cortex, Elasticsearch",
    "internCompany": "Defensive Cyber Operations",
    "internDomain": "Incident Response",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Autopsy, Wireshark, Bash Scripts"
  },
  {
    "sno": 27,
    "umisId": "9002783182",
    "regNo": "24SCC4530",
    "name": "MANIKANDAN A",
    "gender": "Male",
    "dob": "25-10-2006",
    "email": "manikowsi2006@gmail.com",
    "phone": "8072872975",
    "fypTitle": "Automated Dark Web Credential Breach Monitor",
    "fypDesc": "Scrapes Pastebin and public breach dumps to alert organizations of exposed emails.",
    "fypTech": "Tor Proxy, Python, BeautifulSoup, MongoDB",
    "internCompany": "ThreatScope Labs",
    "internDomain": "Threat Intelligence",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "OSINT, TheHarvester, WHOIS"
  },
  {
    "sno": 28,
    "umisId": "9002783149",
    "regNo": "24SCC4531",
    "name": "MANO S",
    "gender": "Male",
    "dob": "27-09-2006",
    "email": "smdmano2006@gmail.com",
    "phone": "7708867310",
    "fypTitle": "Network Packet Sniffer & Protocol Analyzer with Protocol Reconstruction",
    "fypDesc": "Decodes unencrypted application layer protocols and flags credential disclosures.",
    "fypTech": "Python, Scapy, PyQt5, SQLite",
    "internCompany": "DataFlow Systems",
    "internDomain": "Network Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Wireshark, Cisco Packet Tracer, Linux"
  },
  {
    "sno": 29,
    "umisId": "9002783203",
    "regNo": "24SCC4532",
    "name": "MANOJ M",
    "gender": "Male",
    "dob": "20-09-2006",
    "email": "manojmahendiran2006@gmail.com",
    "phone": "8610069184",
    "fypTitle": "Forensic Deleted File Carving Tool for NTFS Volumes",
    "fypDesc": "Carves orphaned image and document files directly from unallocated disk clusters.",
    "fypTech": "Python, Sleuth Kit, MFT Parser",
    "internCompany": "Forensics India Group",
    "internDomain": "Digital Forensics",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Autopsy, FTK Imager, Windows CMD"
  },
  {
    "sno": 30,
    "umisId": "9002783228",
    "regNo": "24SCC4533",
    "name": "MITHRAN V M",
    "gender": "Male",
    "dob": "06-08-2005",
    "email": "realmithran@gmail.com",
    "phone": "8637405615",
    "fypTitle": "Active Directory Kerberos Ticket Attack (Golden Ticket) Detector",
    "fypDesc": "Monitors Windows Event ID 4768 and 4769 logs for anomalies in Kerberos TGT lifespans.",
    "fypTech": "PowerShell, C#, Event Tracing for Windows",
    "internCompany": "Enterprise Defense Labs",
    "internDomain": "Active Directory Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Windows CLI, Sysinternals, FTK Imager"
  },
  {
    "sno": 31,
    "umisId": "9002783258",
    "regNo": "24SCC4534",
    "name": "NAVEENRAJ S",
    "gender": "Male",
    "dob": "06-02-2007",
    "email": "rajnaveen39882@gmail.com",
    "phone": "7373817150",
    "fypTitle": "Homograph Domain & Typosquatting Brand Impersonation Hunter",
    "fypDesc": "Generates permuted domain names to flag active malicious squatters targeting brands.",
    "fypTech": "Python, dnspython, WHOIS API, Redis",
    "internCompany": "CyberSurveillance Corp",
    "internDomain": "Brand Protection",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "URLVoid, IP Void, nslookup"
  },
  {
    "sno": 32,
    "umisId": "9002783441",
    "regNo": "24SCC4535",
    "name": "PAVISH S",
    "gender": "Male",
    "dob": "19-10-2006",
    "email": "pavish041@gmail.com",
    "phone": "9345264850",
    "fypTitle": "Serverless Honeynet with Geo-Spatial Attack Mapping",
    "fypDesc": "Spins up cheap cloud micro-honeypots to log geographical attacker source vectors.",
    "fypTech": "AWS Lambda, DynamoDB, Leaflet.js, Python",
    "internCompany": "SecureGrid India",
    "internDomain": "Honeypots & SOC",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Docker, Kali Linux, Nmap"
  },
  {
    "sno": 33,
    "umisId": "9002783268",
    "regNo": "24SCC4536",
    "name": "PAVITHRAN Y",
    "gender": "Male",
    "dob": "23-03-2006",
    "email": "pavithrankrish23@gmail.com",
    "phone": "9698817741",
    "fypTitle": "Static Source Code Security Scanner for Node.js Applications",
    "fypDesc": "Parses JavaScript AST trees to identify dangerous sinks like eval() and exec().",
    "fypTech": "Node.js, Acorn AST, ESLint Rule Engine",
    "internCompany": "CodeSecure Software",
    "internDomain": "Static Code Analysis",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Burp Suite, OWASP Juice Shop, Git"
  },
  {
    "sno": 34,
    "umisId": "9002783287",
    "regNo": "24SCC4537",
    "name": "PERIYAKARUPPAN N",
    "gender": "Male",
    "dob": "29-12-2006",
    "email": "kumarnateshan862@gmail.com",
    "phone": "6379446965",
    "fypTitle": "Malicious Document & Macro Payload Extractor for Office Files",
    "fypDesc": "Decompresses and analyzes VBA macros inside Word and Excel documents.",
    "fypTech": "Python, olevba, ViperMonkey, Docker",
    "internCompany": "MacroDefense Solutions",
    "internDomain": "Malware Analysis",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "YARA Rules, EICAR, Sandboxing"
  },
  {
    "sno": 35,
    "umisId": "9002783424",
    "regNo": "24SCC4538",
    "name": "RISHIKANNAN M",
    "gender": "Male",
    "dob": "24-09-2006",
    "email": "ragulrishi2409@gmail.com",
    "phone": "8778247261",
    "fypTitle": "Automated SSL/TLS Certificate Expiration & Cipher Suite Auditor",
    "fypDesc": "Discovers outdated TLS 1.0/1.1 protocols and weak CBC cipher suites on server estates.",
    "fypTech": "Python, OpenSSL CLI, React, SQLite",
    "internCompany": "CipherSec Technologies",
    "internDomain": "Cryptography & TLS",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Burp Suite CA, Nmap SSL Scans"
  },
  {
    "sno": 36,
    "umisId": "9002783307",
    "regNo": "24SCC4539",
    "name": "TAMILARASAN T",
    "gender": "Male",
    "dob": "12-05-2006",
    "email": "tamilarsan403@gmail.com",
    "phone": "6369971790",
    "fypTitle": "Real-Time ARP Spoofing Detection & Network Quarantine Engine",
    "fypDesc": "Monitors ARP replies for IP-MAC mapping mismatches and triggers port shutdowns.",
    "fypTech": "Python, Scapy, SNMP, Linux",
    "internCompany": "LANProtect Systems",
    "internDomain": "Network Defense",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Cisco Packet Tracer, Wireshark, Linux"
  },
  {
    "sno": 37,
    "umisId": "9002783438",
    "regNo": "24SCC4540",
    "name": "THAMBISARATHI M",
    "gender": "Male",
    "dob": "08-07-2006",
    "email": "murugeshsarathi07@gmail.com",
    "phone": "9342550580",
    "fypTitle": "Browser Extension Threat Analyzer & Permissions Auditor",
    "fypDesc": "Inspects manifest.json and background script capabilities of browser add-ons.",
    "fypTech": "JavaScript, Chrome Extensions API, Node.js",
    "internCompany": "Endpoint Defense Labs",
    "internDomain": "Browser Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "DevTools Console, LocalStorage, Cookies"
  },
  {
    "sno": 38,
    "umisId": "9992938502",
    "regNo": "24SCC4541",
    "name": "VETRIVEL B",
    "gender": "Male",
    "dob": "01-12-2006",
    "email": "vetrivelb7@gmail.com",
    "phone": "7810034746",
    "fypTitle": "Encrypted DNS (DNS over HTTPS) Privacy & Security Proxy",
    "fypDesc": "Prevents ISP SNI eavesdropping and DNS hijacking through cloud DoH tunnels.",
    "fypTech": "Rust, Cloudflare 1.1.1.1 API, Linux",
    "internCompany": "PrivacyNet Systems",
    "internDomain": "Network Privacy",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "DNS, DHCP, Packet Tracer"
  },
  {
    "sno": 39,
    "umisId": "9002783427",
    "regNo": "24SCC4542",
    "name": "VIBIN A",
    "gender": "Male",
    "dob": "06-10-2007",
    "email": "vibinchitradevi@gmail.com",
    "phone": "8248322004",
    "fypTitle": "Automated Subdomain Takeover Detection Engine",
    "fypDesc": "Scans dangling DNS CNAME records pointing to unclaimed third-party services.",
    "fypTech": "Python, Sublist3r, AWS Route53 API",
    "internCompany": "Vulnerability Research Labs",
    "internDomain": "Web Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "TheHarvester, Gobuster, WHOIS"
  },
  {
    "sno": 40,
    "umisId": "9002783446",
    "regNo": "24SCC4543",
    "name": "VINOTHKUMAR M S",
    "gender": "Male",
    "dob": "08-08-2007",
    "email": "vinothkumar314y@gmail.com",
    "phone": "8870329237",
    "fypTitle": "Industrial Control System (ICS/SCADA) Modbus Protocol Firewall",
    "fypDesc": "Deep-packet inspection gateway checking Modbus function codes against safety bounds.",
    "fypTech": "Python, PyModbus, Scapy, Docker",
    "internCompany": "Industrial Defense Systems",
    "internDomain": "SCADA & ICS Security",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Wireshark, Cisco Packet Tracer"
  },
  {
    "sno": 41,
    "umisId": "9002783430",
    "regNo": "24SCC4544",
    "name": "YASHWANTH K S",
    "gender": "Male",
    "dob": "02-06-2007",
    "email": "k.s.y.9025379363@gmail.com",
    "phone": "8637606255",
    "fypTitle": "Zero-Knowledge Proof Authentication System for Web Apps",
    "fypDesc": "Implements zk-SNARKs passwordless authentication preventing server credential exposure.",
    "fypTech": "Circom, Snarkjs, Node.js, WebAssembly",
    "internCompany": "ZeroKnowledge Tech",
    "internDomain": "Cryptography",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Hydra, Hashcat, Linux Commands"
  },
  {
    "sno": 42,
    "umisId": "9993007632",
    "regNo": "24SCC4545",
    "name": "DHANASEKAR S",
    "gender": "Male",
    "dob": "24-11-2006",
    "email": "dhanasekarsankars@gmail.com",
    "phone": "9952514730",
    "fypTitle": "Automated Cloud Bucket Misconfiguration & Leakage Scanner",
    "fypDesc": "Discovers world-readable Amazon S3 and Google Cloud Storage buckets.",
    "fypTech": "Go, AWS SDK, GCP Storage API",
    "internCompany": "CloudGuard Security",
    "internDomain": "Cloud Defense",
    "internTitle": "Industrial Internship Report - Cyber Security and Network Security",
    "internTech": "Docker, AWS Console, Linux CLI"
  }
];

async function seed2024Batch() {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campuserp';
    console.log('[DB] Connecting to MongoDB...');
    await mongoose.connect(connStr);
    console.log('[DB] Connected successfully.');

    // Ensure uploads directory and sample PDFs exist
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const srcPdf = path.resolve(
      'C:/Users/Admin/.gemini/antigravity/brain/aa17ef63-ef3c-42f2-9eca-8d4de121bab2/.user_uploaded/media_1793605561219_1b02a36c.pdf'
    );
    if (fs.existsSync(srcPdf)) {
      fs.copyFileSync(srcPdf, path.join(uploadsDir, 'Cyber_Security_Industrial_Internship_Report.pdf'));
      fs.copyFileSync(srcPdf, path.join(uploadsDir, 'Cyber_Security_Final_Year_Project_Report.pdf'));
      fs.copyFileSync(srcPdf, path.join(uploadsDir, 'Cyber_Security_Internship_Certificate.pdf'));
      fs.copyFileSync(srcPdf, path.join(uploadsDir, 'sample_report.pdf'));
      console.log('[Uploads] Real Cyber Security PDF documents copied into backend/uploads directory.');
    }

    // 1. Ensure Staff Account
    let staffUser = await User.findOne({ email: 'staff@college.edu' });
    if (!staffUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('staff123', salt);
      staffUser = await User.create({
        name: 'HOD',
        email: 'staff@college.edu',
        password: hashedPassword,
        role: 'staff',
        department: 'Computer Science with Cyber Security',
        phone: '9876543211',
      });
      console.log('[Staff] Created default staff account: staff@college.edu');
    } else {
      staffUser.department = 'Computer Science with Cyber Security';
      await staffUser.save();
    }

    // Ensure Admin Account
    let adminUser = await User.findOne({ email: 'admin@college.edu' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      adminUser = await User.create({
        name: 'System Administrator',
        email: 'admin@college.edu',
        password: hashedPassword,
        role: 'admin',
        department: 'Administration',
        phone: '9876543210',
      });
      console.log('[Admin] Created default admin account: admin@college.edu');
    }

    // Also support student@college.edu demo login mapped to Karthick V (24SCC4524)
    let demoStudentUser = await User.findOne({ email: 'student@college.edu' });
    if (!demoStudentUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('student123', salt);
      demoStudentUser = await User.create({
        name: 'Karthick V',
        email: 'student@college.edu',
        password: hashedPassword,
        role: 'student',
        department: 'Computer Science with Cyber Security',
        phone: '8667316956',
      });
    } else {
      demoStudentUser.name = 'Karthick V';
      await demoStudentUser.save();
    }

    // 2. Clear out old students to fulfill requirement:
    // "spilt students batch in 2025,2023 other batch will be empty"
    const validRegList = STUDENTS_2024.map((s) => s.regNo);
    console.log(`[Clean] Purging old non-2024 student records...`);
    const oldStudents = await Student.find({ registerNumber: { $nin: validRegList } });
    const oldStudentIds = oldStudents.map((s) => s._id);

    await SemesterMark.deleteMany({
      $or: [{ studentId: { $in: oldStudentIds } }, { registerNumber: { $nin: validRegList } }],
    });
    await FinalYearProject.deleteMany({
      $or: [{ studentId: { $in: oldStudentIds } }, { registerNumber: { $nin: validRegList } }],
    });
    await InternshipReport.deleteMany({
      $or: [{ studentId: { $in: oldStudentIds } }, { registerNumber: { $nin: validRegList } }],
    });
    await CiaMark.deleteMany({
      $or: [{ studentId: { $in: oldStudentIds } }, { registerNumber: { $nin: validRegList } }],
    });
    await Student.deleteMany({ registerNumber: { $nin: validRegList } });
    console.log(`[Clean] Legacy records cleared.`);

    const defaultPasswordHash = await bcrypt.hash('student123', await bcrypt.genSalt(10));

    console.log(`[Seeding] Processing all ${STUDENTS_2024.length} students individually...`);

    const allSemesterMarks = [];
    const allCiaMarks = [];

    for (const item of STUDENTS_2024) {
      // 1. Ensure User Account (Password defaults to student's UMIS ID)
      let stuUser = await User.findOne({ email: item.email });
      const studentPassword = item.umisId || 'student123';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(studentPassword, salt);

      if (!stuUser) {
        stuUser = await User.create({
          name: item.name,
          email: item.email,
          password: hashedPassword,
          role: 'student',
          department: 'Computer Science with Cyber Security',
          phone: item.phone,
        });
      } else {
        stuUser.name = item.name;
        stuUser.department = 'Computer Science with Cyber Security';
        stuUser.phone = item.phone;
        stuUser.password = hashedPassword;
        await stuUser.save();
      }

      // If this is Karthick V, also link demoStudentUser if needed
      const assignedUserId = item.regNo === '24SCC4524' && demoStudentUser ? demoStudentUser._id : stuUser._id;

      // 2. Ensure Student Document
      let student = await Student.findOne({ registerNumber: item.regNo });
      const studentFields = {
        userId: assignedUserId,
        name: item.name,
        registerNumber: item.regNo,
        rollNumber: item.regNo,
        department: 'Computer Science with Cyber Security',
        course: 'B.Sc. CS with Cyber Security',
        academicYear: '2024 - 2027',
        batch: '2024-2027',
        email: item.email,
        phone: item.phone,
        gender: item.gender,
        dob: item.dob,
        umisId: item.umisId,
        assignedStaff: null,
      };

      if (!student) {
        student = await Student.create(studentFields);
        console.log(`[Student #${item.sno}] Created: ${student.name} (${student.registerNumber}) - 2024 Batch`);
      } else {
        Object.assign(student, studentFields);
        await student.save();
        console.log(`[Student #${item.sno}] Updated: ${student.name} (${student.registerNumber}) - 2024 Batch`);
      }

      // 3. Ensure Final Year Project
      let fyp = await FinalYearProject.findOne({ registerNumber: item.regNo });
      const fypFields = {
        studentId: student._id,
        studentName: item.name,
        registerNumber: item.regNo,
        projectTitle: item.fypTitle,
        projectDescription: item.fypDesc,
        technologyUsed: item.fypTech,
        projectGuide: 'Dr. Priya Sharma',
        guideStaffId: staffUser._id,
        reportPdf: 'Cyber_Security_Final_Year_Project_Report.pdf',
        reportPdfOriginalName: `${item.regNo}_Final_Year_Project_Report.pdf`,
        submissionDate: new Date('2026-04-10'),
      };
      if (!fyp) {
        await FinalYearProject.create(fypFields);
      } else {
        Object.assign(fyp, fypFields);
        await fyp.save();
      }

      // 4. Ensure Internship Report
      let intern = await InternshipReport.findOne({ registerNumber: item.regNo });
      const internFields = {
        studentId: student._id,
        studentName: item.name,
        registerNumber: item.regNo,
        companyName: item.internCompany,
        internshipDomain: item.internDomain,
        projectTitle: item.internTitle,
        technologyUsed: item.internTech,
        duration: '2 Months (60 Days)',
        completionStatus: 'Completed',
        reportPdf: 'Cyber_Security_Industrial_Internship_Report.pdf',
        reportPdfOriginalName: `${item.regNo}_Industrial_Internship_Report.pdf`,
        certificatePdf: 'Cyber_Security_Internship_Certificate.pdf',
        certificatePdfOriginalName: `${item.regNo}_Internship_Certificate.pdf`,
        submissionDate: new Date('2026-02-15'),
      };
      if (!intern) {
        await InternshipReport.create(internFields);
      } else {
        Object.assign(intern, internFields);
        await intern.save();
      }

      // 5. Accumulate Semester Marks for Semesters 1 to 6
      for (let sem = 1; sem <= 6; sem++) {
        const subjects = CURRICULUM[sem];
        for (const sub of subjects) {
          let obt = 0;
          if (sem === 1 && item.sem1Marks && item.sem1Marks[sub.code] !== undefined) {
            obt = item.sem1Marks[sub.code];
          } else {
            const base = 75 + ((item.sno * 7 + sem * 5 + sub.code.charCodeAt(sub.code.length - 1)) % 21);
            obt = Math.min(100, Math.max(55, base));
          }

          allSemesterMarks.push({
            studentId: student._id,
            studentName: item.name,
            registerNumber: item.regNo,
            batch: '2024-2027',
            semester: sem,
            subjectCode: sub.code,
            subjectName: sub.name,
            subjectType: sub.type,
            maxMarks: sub.max,
            obtainedMarks: obt,
            resultStatus: obt >= 40 ? 'Pass' : 'Fail',
            academicYear: '2024 - 2027',
          });
        }
      }

      // 6. Accumulate CIA 1, CIA 2, and CIA 3 Marks for Semesters 1 to 6
      for (let sem = 1; sem <= 6; sem++) {
        const subjects = CURRICULUM[sem];
        for (const sub of subjects) {
          for (const assessmentType of ['CIA 1', 'CIA 2', 'CIA 3']) {
            let obtCia = 0;
            const ciaOffset = assessmentType === 'CIA 1' ? 0 : assessmentType === 'CIA 2' ? 1 : 2;

            if (sem === 1 && item.sem1Marks && item.sem1Marks[sub.code] !== undefined) {
              const base100 = item.sem1Marks[sub.code];
              const scaled = Math.round((base100 / 2) + (ciaOffset - 1));
              obtCia = Math.min(50, Math.max(20, scaled));
            } else {
              const base = 35 + ((item.sno * 5 + sem * 3 + ciaOffset * 2 + sub.code.charCodeAt(sub.code.length - 1)) % 14);
              obtCia = Math.min(50, Math.max(25, base));
            }

            allCiaMarks.push({
              studentId: student._id,
              studentName: item.name,
              registerNumber: item.regNo,
              batch: '2024-2027',
              assessmentType,
              semester: sem,
              subjectCode: sub.code,
              subjectName: sub.name,
              subjectType: sub.type,
              maxMarks: 50,
              obtainedMarks: obtCia,
              resultStatus: obtCia >= 25 ? 'Pass' : 'Fail',
              academicYear: '2024 - 2027',
              examDate: new Date(2024 + Math.floor((sem - 1) / 2), ((sem - 1) % 2) * 6 + (ciaOffset + 1) * 2, 15),
            });
          }
        }
      }
    }

    console.log(`[Seeding] Bulk inserting ${allSemesterMarks.length} Semester Marks...`);
    await SemesterMark.deleteMany({ registerNumber: { $in: validRegList } });
    await SemesterMark.insertMany(allSemesterMarks, { ordered: false });

    console.log(`[Seeding] Bulk inserting ${allCiaMarks.length} CIA Marks...`);
    await CiaMark.deleteMany({ registerNumber: { $in: validRegList } });
    await CiaMark.insertMany(allCiaMarks, { ordered: false });

    const totalStudents = await Student.countDocuments();
    const totalFYP = await FinalYearProject.countDocuments();
    const totalIntern = await InternshipReport.countDocuments();
    const totalMarks = await SemesterMark.countDocuments();
    const totalCiaMarks = await CiaMark.countDocuments();

    console.log('====================================================');
    console.log('🎉 2024 BATCH SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`👥 Total Students: ${totalStudents} (All in 2024-2027 Batch)`);
    console.log(`📁 Final-Year Projects: ${totalFYP}`);
    console.log(`💼 Internship Reports: ${totalIntern}`);
    console.log(`📊 Semester Marks: ${totalMarks}`);
    console.log(`📝 CIA Marks: ${totalCiaMarks} (Across CIA 1, CIA 2, CIA 3 & Sem 1-6)`);
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('[Error] Seeding failed:', err);
    process.exit(1);
  }
}

seed2024Batch();

